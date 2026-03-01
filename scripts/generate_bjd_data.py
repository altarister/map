import urllib.request
import urllib.parse
import json
import os
import sys

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_bjd.py [VWORLD_API_KEY]")
        sys.exit(1)
        
    vworld_key = sys.argv[1]
    
    # We want Bupjeong-dong (법정동) geometries. 
    # VWorld API 'LT_C_BJDINFO' contains the polygons.
    # We will search by bbox for South Korea roughly, or query area by area.
    # Max features per request is 1000. Korea has ~5000 dongs, so we page it, or we just grab Gyeonggi-do (Code 41)
    
    # We construct a WFS GetFeature request
    # Since VWorld requires a domain, we pass "http://localhost"
    base_url = "https://api.vworld.kr/req/data"
    
    features = []
    
    # Gyeonggi-do code is 41
    # Gwangju is 41610 in Bupjeong-dong code
    
    # Let's just query Gwangju (41610) for now to fix the user's immediate issue
    params = {
        "service": "data",
        "request": "GetFeature",
        "data": "LT_C_ADEMD_INFO",
        "key": vworld_key,
        "domain": "http://www.altari.com",
        "attrFilter": "emd_cd:like:41610", # Gwangju city code in Vworld
        "size": "1000",
        "format": "json"
    }
    
    query = urllib.parse.urlencode(params)
    url = f"{base_url}?{query}"
    
    print(f"Fetching Bupjeong-dong data from VWORLD WFS...")
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            
            if res_data.get("response", {}).get("status") != "OK":
                print(f"Error fetching data: {res_data}")
                sys.exit(1)
                
            features = res_data["response"]["result"]["featureCollection"]["features"]
            print(f"Successfully fetched {len(features)} legal dongs for Gwangju!")
            
            # Format to match our app's GeoJSON structure
            # app expects props: { code, name, SIG_KOR_NM, EMD_KOR_NM }
            transformed_features = []
            for f in features:
                props = f["properties"]
                bjd_cd = props.get("emd_cd", "")
                bjd_nm = props.get("emd_kor_nm", "")
                
                # Transform props
                new_props = {
                    "code": bjd_cd,
                    "name": bjd_nm,
                    "SIG_KOR_NM": "광주시",
                    "EMD_KOR_NM": bjd_nm
                }
                
                transformed_features.append({
                    "type": "Feature",
                    "geometry": f["geometry"],
                    "properties": new_props
                })
                
            out_geojson = {
                "type": "FeatureCollection",
                "features": transformed_features
            }
            
            out_path = "public/data/gwangju_bupjeongdong.geojson"
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(out_geojson, f, ensure_ascii=False)
                
            print(f"Saved to {out_path}. You can now replace useGeoData.ts to load this file.")
            
    except Exception as e:
        print(f"Exception occurred: {e}")

if __name__ == "__main__":
    main()
