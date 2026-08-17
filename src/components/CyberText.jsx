import { useState, useEffect } from 'react';

const CHARACTERS = '01';

export default function CyberText({ text, speed = 30, delay = 0 }) {
  const [displayText, setDisplayText] = useState('');
  const [isRevealing, setIsRevealing] = useState(false);

  useEffect(() => {
    let timeout;
    if (delay > 0) {
      timeout = setTimeout(() => setIsRevealing(true), delay);
    } else {
      setIsRevealing(true);
    }
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    if (!isRevealing) return;

    let iteration = 0;
    let animationFrame;

    const animate = () => {
      setDisplayText(
        text
          .split('')
          .map((letter, index) => {
            if (index < iteration) {
              return letter; // Revealed correctly
            }
            if (letter === ' ') return ' '; // Preserve spaces immediately
            return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
          })
          .join('')
      );

      // Increase iteration smoothly
      if (iteration < text.length) {
        iteration += 1 / (speed / 10);
        animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayText(text); // Ensure exactly matches at the end
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [text, isRevealing, speed]);

  return <span className="cyber-text">{displayText || ' '}</span>;
}
