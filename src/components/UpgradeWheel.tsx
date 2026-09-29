import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import manifest from '../../wheel_parts/manifest.json';
import { useTranslation } from '../lib/i18n';

interface UpgradeWheelProps {
  winChance: number;               // 0 to 95 (%)
  controls: any;                   // motion animation controls
  isSpinning?: boolean;
  size?: number | string;          // display size in px
}

export const UpgradeWheel: React.FC<UpgradeWheelProps> = ({
  winChance,
  controls,
  isSpinning = false,
  size = 405,
}) => {
  const { t } = useTranslation();
  const { wheel_center, radii } = manifest;
  const [cx, cy] = wheel_center; // 617, 583
  const viewBoxSize = 1254;

  const totalSegments = 72;
  const degPerSegment = 360 / totalSegments; // exactly 5 degrees per segment

  // Exact concentric radii for strictly even, non-protruding, seamless circular ring
  const rInner = 214;
  const rOuter = 392;

  // Number of active win segments (from 0 to totalSegments)
  const hasBets = winChance > 0;
  const greenSegmentsCount = hasBets
    ? Math.max(1, Math.min(totalSegments - 1, Math.round((winChance / 100) * totalSegments)))
    : 0;

  // Function to create an exact annular sector path with ZERO gaps and uniform boundaries
  const getSectorPath = (startDeg: number, endDeg: number, rIn: number, rOut: number) => {
    // 0 deg is straight UP (12 o'clock).
    // In SVG standard coordinates, angle in radians = (deg - 90) * PI / 180.
    const startRad = ((startDeg - 90) * Math.PI) / 180;
    const endRad = ((endDeg - 90) * Math.PI) / 180;

    const x1 = cx + rOut * Math.cos(startRad);
    const y1 = cy + rOut * Math.sin(startRad);
    const x2 = cx + rOut * Math.cos(endRad);
    const y2 = cy + rOut * Math.sin(endRad);

    const x3 = cx + rIn * Math.cos(endRad);
    const y3 = cy + rIn * Math.sin(endRad);
    const x4 = cx + rIn * Math.cos(startRad);
    const y4 = cy + rIn * Math.sin(startRad);

    // Clockwise outer arc (sweep = 1), counter-clockwise inner arc (sweep = 0)
    return `M ${x1} ${y1} A ${rOut} ${rOut} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 0 0 ${x4} ${y4} Z`;
  };

  // Pre-calculate all 72 segments strictly without gaps and flat colors without shadows
  const segmentsData = useMemo(() => {
    const list = [];

    for (let i = 0; i < totalSegments; i++) {
      const startAngle = i * degPerSegment;
      const endAngle = (i + 1) * degPerSegment;
      const centerAngle = (i + 0.5) * degPerSegment;

      let fillColor = '#333742';
      let strokeColor = '#1d2027';

      if (!hasBets) {
        // Empty wheel without bets: clean flat grey segments, subtle alternating tones
        fillColor = i % 2 === 0 ? '#383d49' : '#2f343f';
        strokeColor = '#21252d';
      } else {
        // With bets: classic flat green for win chance, flat red for remaining loss
        const isWin = i < greenSegmentsCount;
        if (isWin) {
          fillColor = i % 2 === 0 ? '#22c55e' : '#16a34a'; // classic flat green, no shadow
          strokeColor = '#13151b';
        } else {
          fillColor = i % 2 === 0 ? '#ef4444' : '#dc2626'; // classic flat red, no shadow
          strokeColor = '#13151b';
        }
      }

      const pathData = getSectorPath(startAngle, endAngle, rInner, rOuter);

      list.push({
        index: i,
        startAngle,
        endAngle,
        centerAngle,
        fillColor,
        strokeColor,
        pathData,
      });
    }

    return list;
  }, [hasBets, greenSegmentsCount, totalSegments, degPerSegment, cx, cy]);

  return (
    <div 
      className="relative mx-auto select-none flex items-center justify-center shrink-0"
      style={{ 
        width: typeof size === 'number' ? `${size}px` : size, 
        height: typeof size === 'number' ? `${size}px` : size,
        maxWidth: '100%',
        maxHeight: '100%'
      }}
    >
      {/* SVG Canvas for Wheel Assembly */}
      <svg
        viewBox={`${cx - 480} ${cy - 480} 960 960`}
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Metallic Outer Bezel Gradient */}
          <radialGradient id="bezelOuterGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#252a36" />
            <stop offset="78%" stopColor="#151821" />
            <stop offset="92%" stopColor="#2d3444" />
            <stop offset="100%" stopColor="#0d0f14" />
          </radialGradient>

          {/* Center Hub Metal Body */}
          <radialGradient id="hubCenterGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#212530" />
            <stop offset="65%" stopColor="#14171f" />
            <stop offset="85%" stopColor="#1a1e27" />
            <stop offset="100%" stopColor="#090b0f" />
          </radialGradient>

          {/* Blue Neon Glow for Center Hub Ring */}
          <filter id="neonBlueGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* 3D Volumetric Arrow Drop Shadow onto Wheel Segments */}
          <filter id="arrow3DShadow" x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.85" />
          </filter>

          {/* 3D Arrow Left Illuminated Facet */}
          <linearGradient id="arrowGoldLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#fef08a" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* 3D Arrow Right Shaded Facet */}
          <linearGradient id="arrowGoldRight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="45%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* Base Carriage Metallic Gradient */}
          <linearGradient id="arrowBaseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="40%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Arrow Neon Tip Glow */}
          <filter id="arrowTipGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. STATIC: Outer Bezel Ring (outer_bezel_ring) */}
        <g id="outer_bezel_ring">
          {/* Main Bezel Rim */}
          <circle
            cx={cx}
            cy={cy}
            r={radii.bezel_outer}
            fill="url(#bezelOuterGrad)"
            stroke="#2f3747"
            strokeWidth="5"
          />

          {/* Inner Bezel Groove */}
          <circle
            cx={cx}
            cy={cy}
            r={radii.bezel_inner}
            fill="#0b0d12"
            stroke="#1b1f28"
            strokeWidth="3"
          />

          {/* 72 Tick Markers on Bezel Ring */}
          {Array.from({ length: 72 }).map((_, i) => {
            const angle = (i * 360) / 72;
            const rad = ((angle - 90) * Math.PI) / 180;
            const isMajor = i % 6 === 0;
            const rStart = radii.bezel_inner + 4;
            const rEnd = isMajor ? radii.bezel_outer - 8 : radii.bezel_inner + 14;
            const x1 = cx + rStart * Math.cos(rad);
            const y1 = cy + rStart * Math.sin(rad);
            const x2 = cx + rEnd * Math.cos(rad);
            const y2 = cy + rEnd * Math.sin(rad);

            return (
              <line
                key={`bezel-tick-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? '#475569' : '#1e2430'}
                strokeWidth={isMajor ? 3.5 : 1.5}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* 2. STATIC: 72 Segment Blocks (NO GAPS, FLAT NO SHADOWS) */}
        <g id="static_segments_track">
          {/* Base ring under segments */}
          <circle
            cx={cx}
            cy={cy}
            r={rOuter}
            fill="#090b0e"
            stroke="none"
          />

          {/* All 72 Strict, Uniform Segments */}
          {segmentsData.map((seg) => (
            <path
              key={`segment-block-${seg.index}`}
              d={seg.pathData}
              fill={seg.fillColor}
              stroke={seg.strokeColor}
              strokeWidth="1.2"
              className="transition-colors duration-200"
            />
          ))}

          {/* Clean hairline borders for sector ring */}
          <circle
            cx={cx}
            cy={cy}
            r={rOuter}
            fill="none"
            stroke="#161820"
            strokeWidth="2"
          />
          <circle
            cx={cx}
            cy={cy}
            r={rInner}
            fill="none"
            stroke="#161820"
            strokeWidth="2"
          />
        </g>

        {/* 3. STATIC: Center Hub with Blue Neon Ring */}
        <g id="center_hub_assembly">
          {/* Outer Hub Ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radii.hub_outer_including_blue_ring}
            fill="url(#hubCenterGrad)"
            stroke="#2d3545"
            strokeWidth="4"
          />

          {/* Glowing Neon Blue Ring from manifest */}
          <circle
            cx={cx}
            cy={cy}
            r={radii.hub_outer_including_blue_ring - 12}
            fill="none"
            stroke="#00d2ff"
            strokeWidth="7"
            filter="url(#neonBlueGlow)"
            opacity="0.95"
          />

          {/* White core highlight for neon */}
          <circle
            cx={cx}
            cy={cy}
            r={radii.hub_outer_including_blue_ring - 12}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            opacity="0.8"
          />

          {/* Dark Inner Hub Plate */}
          <circle
            cx={cx}
            cy={cy}
            r={radii.hub_outer_including_blue_ring - 26}
            fill="#0c0e14"
            stroke="#1b202c"
            strokeWidth="3"
          />

          {/* Center Info Typography */}
          <text
            x={cx}
            y={cy - 22}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="36"
            fontWeight="bold"
            letterSpacing="3"
            className="font-display select-none"
          >
            {t('chance')}
          </text>
          <text
            x={cx}
            y={cy + 42}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="78"
            fontWeight="900"
            className="font-display select-none tracking-tight"
          >
            {winChance.toFixed(1)}%
          </text>
        </g>

        {/* 4. ROTATING AROUND THE ENTIRE WHEEL: Volumetric 3D Elongated Pointer Arrow */}
        <g transform={`translate(${cx}, ${cy})`}>
          <motion.g
            id="orbiting_pointer_arrow"
            animate={controls}
            style={{
              transformOrigin: "0px 0px",
            }}
          >
            {/* Full-diameter invisible bounding circle centered at (0, 0) guaranteeing 100% precision orbit around wheel center */}
            <circle
              cx={0}
              cy={0}
              r={500}
              fill="none"
              stroke="none"
              opacity={0}
              pointerEvents="none"
            />

            {/* 1. Deep Volumetric Drop Shadow casting onto wheel blocks */}
            <polygon
              points="
                0,-344
                -20,-412
                -15,-452
                15,-452
                20,-412
              "
              fill="#000000"
              filter="url(#arrow3DShadow)"
            />

            {/* 2. Metallic Bezel Mounting Carriage */}
            <path
              d="M -24 -458 Q 0 -464 24 -458 L 18 -444 Q 0 -448 -18 -444 Z"
              fill="url(#arrowBaseGrad)"
              stroke="#64748b"
              strokeWidth="1.5"
            />
            {/* Luminous indicator strip on carriage */}
            <path
              d="M -15 -453 Q 0 -457 15 -453"
              stroke="#f59e0b"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Chrome rivets on carriage */}
            <circle cx="-16" cy="-448" r="1.8" fill="#e2e8f0" stroke="#0f172a" strokeWidth="0.8" />
            <circle cx="16" cy="-448" r="1.8" fill="#e2e8f0" stroke="#0f172a" strokeWidth="0.8" />

            {/* 3. Base Collar Chamfer */}
            <polygon
              points="
                0,-434
                -14,-450
                14,-450
              "
              fill="#92400e"
              stroke="#f59e0b"
              strokeWidth="1.2"
            />

            {/* 4. Side Prismatic 3D Thickness Flanges */}
            <polygon
              points="
                -18,-412
                -14,-448
                -19,-448
                -23,-412
              "
              fill="#d97706"
              stroke="#b45309"
              strokeWidth="0.8"
            />
            <polygon
              points="
                18,-412
                14,-448
                19,-448
                23,-412
              "
              fill="#78350f"
              stroke="#451a03"
              strokeWidth="0.8"
            />

            {/* 5. Main 3D Facets (Left Illuminated, Right Shaded) */}
            {/* Left Wing Facet - brilliant specular gold */}
            <polygon
              points="
                0,-348
                -18,-412
                -14,-448
                0,-436
              "
              fill="url(#arrowGoldLeft)"
            />

            {/* Right Wing Facet - deep rich amber/bronze shadow */}
            <polygon
              points="
                0,-348
                0,-436
                14,-448
                18,-412
              "
              fill="url(#arrowGoldRight)"
            />

            {/* 6. Crisp White Contour Rim for High Contrast Over Segments */}
            <polygon
              points="
                0,-348
                -18,-412
                -14,-448
                14,-448
                18,-412
              "
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {/* 7. Raised Central Spine / Ridge Line Highlight */}
            <line
              x1="0"
              y1="-440"
              x2="0"
              y2="-349"
              stroke="#ffffff"
              strokeWidth="2.4"
              strokeLinecap="round"
            />

            {/* 8. Glowing Diamond Cut Precision Pointer Tip over blocks */}
            <g filter="url(#arrowTipGlow)">
              <polygon
                points="
                  0,-345
                  -5,-353
                  0,-361
                  5,-353
                "
                fill="#ffffff"
                stroke="#f59e0b"
                strokeWidth="1.6"
              />
              <circle
                cx="0"
                cy="-349"
                r="3"
                fill="#fde047"
                stroke="#d97706"
                strokeWidth="1"
              />
            </g>
          </motion.g>
        </g>
      </svg>
    </div>
  );
};

export default UpgradeWheel;
