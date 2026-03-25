export const formatRegionName = (name: string): string => {
  if (!name) return '';
  return name.split(' ')[0];
};

export const formatRegionFullName = (fullName: string): string => {
  if (!fullName) return '';
  return fullName.split('/').pop() || fullName;
};
