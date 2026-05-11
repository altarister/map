export const formatRegionName = (name: string): string => {
  if (!name) return '';
  return name.split(' ')[0];
};

export const formatRegionFullName = (fullName: string): string => {
  if (!fullName) return '';
  return fullName.split('/').pop() || fullName;
};

// 화물24시 전용: "경기 / 광주시 / 경안동" → "경기 광주 경안동"
// 인성은 '동' 단위만 노출하지만, 화물24시는 '도+시+동' 풀네임을 노출하는 UI 관행을 따름
export const formatHwamul24Region = (fullName: string): string => {
  if (!fullName) return '';
  return fullName
    .split('/')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.replace(/시$/, '').replace(/군$/, ''))
    .join(' ');
};

