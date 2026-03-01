import urllib.request
import urllib.parse
import json
import os
import sys
import time
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

def fetch_layer(vworld_key, layer_name, attr_filter, size=1000):
    base_url = "https://api.vworld.kr/req/data"
    all_features = []
    page = 1
    
    while True:
        params = {
            "service": "data",
            "request": "GetFeature",
            "data": layer_name,
            "key": vworld_key,
            "domain": "http://www.altari.com",
            "attrFilter": attr_filter,
            "size": str(size),
            "page": str(page),
            "format": "json"
        }
        
        query = urllib.parse.urlencode(params)
        url = f"{base_url}?{query}"
        
        print(f"Fetching {layer_name} page {page}...")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                
                status = res_data.get("response", {}).get("status")
                if status == "NOT_FOUND":
                    # Exhausted pages
                    break
                elif status != "OK":
                    print(f"Error fetching data: {res_data}")
                    return None
                    
                features = res_data["response"]["result"]["featureCollection"]["features"]
                all_features.extend(features)
                print(f" -> Grabbed {len(features)} features (Total: {len(all_features)})")
                
                if len(features) < size:
                    # Last page
                    break
                    
                page += 1
                time.sleep(0.1) # Be nice to the API
        except Exception as e:
            print(f"Exception on {layer_name} page {page}: {e}")
            break
            
    return all_features

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_gyeonggi_bjd_data.py [VWORLD_API_KEY]")
        sys.exit(1)
        
    vworld_key = sys.argv[1]
    
    # 1. Fetch SiGunGu (LT_C_ADSIGG_INFO). Gyeonggi-do code is 41
    print("\n--- Fetching Si/Gun/Gu ---")
    sigg = fetch_layer(vworld_key, "LT_C_ADSIGG_INFO", "sig_cd:like:41", size=100)
    if sigg is None:
        sys.exit(1)
        
    # 2. Fetch Dongs (LT_C_ADEMD_INFO). Gyeonggi-do code is 41
    print("\n--- Fetching Eup/Myeon/Dong ---")
    dongs = fetch_layer(vworld_key, "LT_C_ADEMD_INFO", "emd_cd:like:41")
    if dongs is None:
        sys.exit(1)
        
    # 3. Fetch Ris (LT_C_ADRI_INFO). Gyeonggi-do code is 41
    print("\n--- Fetching Ri ---")
    ris = fetch_layer(vworld_key, "LT_C_ADRI_INFO", "li_cd:like:41")
    if ris is None:
        sys.exit(1)
        
    print(f"\nFetched {len(sigg)} Cities, {len(dongs)} Eup/Myeon/Dongs and {len(ris)} Ris in total.")
    
    # We want "Terminal Nodes". 
    # For Dongs: Keep if it ends with "동". If it ends with "읍" or "면", those are subdivided into "리", so discard the "읍/면" polygons.
    # For Ris: Keep all of them.
    
    terminal_features = []
    
    # Build SIGG lookup table
    sigg_lookup = {}
    for f in sigg:
        props = f["properties"]
        sigg_lookup[props.get("sig_cd", "")] = props.get("sig_kor_nm", "")
    
    # Build EMD lookup table
    emd_lookup = {}
    for f in dongs:
        props = f["properties"]
        emd_lookup[props.get("emd_cd", "")] = props.get("emd_kor_nm", "")
    
    # Process Dongs
    for f in dongs:
        props = f["properties"]
        name = props.get("emd_kor_nm", "")
        code = props.get("emd_cd", "")
        
        if name.endswith("동"):
            sig_code = code[:5] if len(code) >= 5 else ""
            sig_name = sigg_lookup.get(sig_code, "경기도")
            new_props = {
                "code": code,
                "name": name,
                "SIG_KOR_NM": sig_name,
                "EMD_KOR_NM": name,
                "_isEmdGroup": True
            }
            terminal_features.append({
                "type": "Feature",
                "geometry": f["geometry"],
                "properties": new_props
            })
            
    # Process Ris
    for f in ris:
        props = f["properties"]
        name = props.get("li_kor_nm", "")
        code = props.get("li_cd", "")
        
        # li_cd is 10 digits. The first 8 are the EMD code.
        emd_code = code[:8] if len(code) >= 8 else ""
        parent_emd_name = emd_lookup.get(emd_code, "알수없음")
        
        sig_code = code[:5] if len(code) >= 5 else ""
        sig_name = sigg_lookup.get(sig_code, "경기도")
        
        new_props = {
            "code": code,
            "name": name,
            "SIG_KOR_NM": sig_name,
            "EMD_KOR_NM": parent_emd_name,
            "_isEmdGroup": False
        }
        terminal_features.append({
            "type": "Feature",
            "geometry": f["geometry"],
            "properties": new_props
        })

    # Perform Union for EMD groups
    print("\n--- Performing spatial union for Eup/Myeon groups ---")
    ris_by_emd = {}
    for f in ris:
        props = f["properties"]
        code = props.get("li_cd", "")
        emd_code = code[:8] if len(code) >= 8 else ""
        if emd_code not in ris_by_emd:
            ris_by_emd[emd_code] = []
        try:
            geom = shape(f["geometry"])
            if geom.is_valid:
                ris_by_emd[emd_code].append(geom)
            else:
                ris_by_emd[emd_code].append(geom.buffer(0))
        except Exception as e:
            print(f"Warning: skipped invalid geometry in Ri {code}")

    for emd_code, geoms in ris_by_emd.items():
        if not geoms:
            continue
        try:
            merged_geom = unary_union(geoms)
            geom_json = mapping(merged_geom)
            
            parent_emd_name = emd_lookup.get(emd_code, "알수없음")
            sig_code = emd_code[:5] if len(emd_code) >= 5 else ""
            sig_name = sigg_lookup.get(sig_code, "경기도")
            
            terminal_features.append({
                "type": "Feature",
                "geometry": geom_json,
                "properties": {
                    "code": emd_code,
                    "name": parent_emd_name,
                    "SIG_KOR_NM": sig_name,
                    "EMD_KOR_NM": parent_emd_name,
                    "_isEmdGroup": True
                }
            })
        except Exception as e:
            print(f"Failed to union EMD {emd_code}: {e}")
            
    print(f"Total features (Dongs + Ris + Unified EMDs) to save: {len(terminal_features)}")
    
    out_geojson = {
        "type": "FeatureCollection",
        "features": terminal_features
    }
    
    out_path = "public/data/gyeonggi_bupjeongdong.geojson"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out_geojson, f, ensure_ascii=False)
        
    print(f"Saved merged GeoJSON to {out_path} ({os.path.getsize(out_path) / 1024 / 1024:.2f} MB)")
    print("Now update useGeoData.ts to load this file.")

if __name__ == "__main__":
    main()
