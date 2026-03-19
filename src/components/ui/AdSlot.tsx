/**
 * AdSlot — Google AdSense 광고 자리 표시자
 * 실제 광고 코드 삽입 시 children 대신 <ins> 태그 사용
 */
interface AdSlotProps {
  width?: number;
  height?: number;
  className?: string;
}

export const AdSlot = ({ width = 300, height = 250, className = '' }: AdSlotProps) => {
  return (
    <div
      className={`glass-panel flex flex-col items-center justify-center gap-2 p-4
        border border-dashed border-border ${className}`}
      style={{ minWidth: width, minHeight: height }}
    >
      {/*
        [광고 영역] Google AdSense 코드를 여기에 삽입하세요.
        예시:
        <ins className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
            data-ad-slot="XXXXXXXXXX"
            data-ad-format="auto" />
      */}
      <span className="text-[10px] text-muted-foreground/40 font-mono uppercase tracking-widest">AD</span>
      <span className="text-[9px] text-muted-foreground/30 font-mono">{width} × {height}</span>
    </div>
  );
};
