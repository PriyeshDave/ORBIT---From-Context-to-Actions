import { ToolIcon } from "./ToolIcon.jsx";

/**
 * Animated hero visual for the login page - a colleague at the center,
 * with the tools that orbit their workday distributed across three
 * elliptical rings at different sizes, rotations, and speeds (a layered
 * "solar system" look, per feedback that a single ring made icons feel
 * like they were escaping it). Built as a live CSS animation, not a
 * video/GIF file, so it's crisp at any size with no extra asset weight.
 */
const RINGS = [
  {
    // outer ring - slowest
    widthFactor: 0.72, heightFactor: 0.5, rotateDeg: -18, duration: 18, reverse: false,
    icons: [{ tool: "outlook", angle: 0 }, { tool: "teams", angle: 180 }],
  },
  {
    // middle ring - opposite direction for visual variety
    widthFactor: 0.54, heightFactor: 0.36, rotateDeg: 10, duration: 13, reverse: true,
    icons: [{ tool: "slack", angle: 90 }, { tool: "tracker", angle: 270 }],
  },
  {
    // inner ring - slowest of all, smallest
    widthFactor: 0.36, heightFactor: 0.22, rotateDeg: -6, duration: 22, reverse: false,
    icons: [{ tool: "confluence", angle: 45 }, { tool: "servicenow", angle: 225 }],
  },
];

export default function OrbitAnimation({ size = 280 }) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        margin: "0 auto",
        borderRadius: "50%",
        background: "radial-gradient(circle at 50% 50%, var(--accent-primary-tint) 0%, var(--surface-canvas) 70%)",
      }}
    >
      {/* Ring outlines (purely decorative) */}
      {RINGS.map((ring, i) => (
        <div
          key={`ring-outline-${i}`}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: size * ring.widthFactor,
            height: size * ring.heightFactor,
            transform: `translate(-50%, -50%) rotate(${ring.rotateDeg}deg)`,
            border: "1.5px solid var(--accent-primary)",
            borderRadius: "50%",
            opacity: 0.28,
          }}
        />
      ))}

      {/* Colleague at the center - the workday everything orbits around */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: size * 0.24,
          height: size * 0.24,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 30%, #ffffff 0%, var(--accent-primary) 75%)",
          boxShadow: "0 0 24px var(--accent-primary), 0 0 48px var(--accent-primary-tint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.12,
          animation: "orbit-pulse 3s ease-in-out infinite",
        }}
      >
        🧑‍💻
      </div>

      {/* Orbiting rings of tool icons */}
      {RINGS.map((ring, ringIdx) => (
        <div
          key={`ring-${ringIdx}`}
          style={{
            position: "absolute",
            inset: 0,
            animation: `${ring.reverse ? "orbit-spin-reverse" : "orbit-spin"} ${ring.duration}s linear infinite`,
          }}
        >
          {ring.icons.map(({ tool, angle }, i) => {
            const rad = (angle * Math.PI) / 180;
            const rx = (size * ring.widthFactor) / 2;
            const ry = (size * ring.heightFactor) / 2;
            // Point on the UNROTATED ellipse, relative to center
            const ex = rx * Math.cos(rad);
            const ey = ry * Math.sin(rad);
            // Rotate that point by the ring's own rotation so it lands
            // exactly on the visually rotated ring outline (the outline is
            // rotated via CSS transform; this position math must match it).
            const theta = (ring.rotateDeg * Math.PI) / 180;
            const rotatedX = ex * Math.cos(theta) - ey * Math.sin(theta);
            const rotatedY = ex * Math.sin(theta) + ey * Math.cos(theta);
            const x = size / 2 + rotatedX;
            const y = size / 2 + rotatedY;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  transform: "translate(-50%, -50%)",
                  width: size * 0.13,
                  height: size * 0.13,
                  borderRadius: "50%",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: size * 0.02,
                  boxShadow: "var(--shadow-md)",
                  animation: `${ring.reverse ? "orbit-counter-spin-reverse" : "orbit-counter-spin"} ${ring.duration}s linear infinite`,
                }}
              >
                <ToolIcon tool={tool} size={size * 0.095} />
              </div>
            );
          })}
        </div>
      ))}

      <style>{`
        @keyframes orbit-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbit-spin-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes orbit-counter-spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(-360deg); }
        }
        @keyframes orbit-counter-spin-reverse {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes orbit-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
