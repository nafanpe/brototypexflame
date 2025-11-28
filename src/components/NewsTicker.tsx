import { useEffect, useRef } from 'react';

const newsItems = [
  "⚡ New: 3 Complaints resolved today",
  "📢 Community: React Workshop at 4 PM",
  "🔧 Maintenance: Server upgrade scheduled",
  "🎉 Achievement: 50+ active community members"
];

export default function NewsTicker() {
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ticker = tickerRef.current;
    if (!ticker) return;

    const content = ticker.querySelector('.ticker-content') as HTMLElement;
    if (!content) return;

    // Clone content for seamless loop
    const clone = content.cloneNode(true) as HTMLElement;
    ticker.appendChild(clone);

    let position = 0;
    const speed = 0.5; // pixels per frame

    const animate = () => {
      position -= speed;
      const contentWidth = content.offsetWidth;
      
      if (Math.abs(position) >= contentWidth) {
        position = 0;
      }
      
      ticker.style.transform = `translateX(${position}px)`;
      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="bg-black text-white overflow-hidden py-2">
      <div ref={tickerRef} className="flex whitespace-nowrap">
        <div className="ticker-content flex">
          {newsItems.map((item, index) => (
            <span key={index} className="text-xs mx-8">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
