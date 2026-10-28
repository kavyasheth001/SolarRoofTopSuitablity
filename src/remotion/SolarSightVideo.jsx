import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Group, Text, Circle, Line, Polygon } from "./primitives";

// Configuration
const COMPOSITION_WIDTH = 1920;
const COMPOSITION_HEIGHT = 1080;
const COMPOSITION_FPS = 30;
const COMPOSITION_DURATION_IN_SECONDS = 150; // 2:30 minutes

// Colors
const COLORS = {
  primaryBlue: "#1e3a5f",
  successGreen: "#10b981",
  warningAmber: "#f59e0b",
  errorRed: "#ef4444",
  white: "#ffffff",
  lightGray: "#f8fafc",
  darkGray: "#334155",
};

// Helper to convert seconds to frames
const secToFrames = (sec) => sec * COMPOSITION_FPS;

// Main Video Component
const SolarSightVideo = () => {
  const currentFrame = useCurrentFrame();
  const currentTime = currentFrame / COMPOSITION_FPS;
  const progress = currentTime / COMPOSITION_DURATION_IN_SECONDS;

  // Determine current scene based on time
  let currentScene = "intro";
  let sceneProgress = 0;
  let timeInScene = 0;

  const scenes = [
    { name: "intro", duration: 20 },
    { name: "solution", duration: 20 },
    { name: "shadow", duration: 15 },
    { name: "score", duration: 15 },
    { name: "financial", duration: 15 },
    { name: "whatif", duration: 15 },
    { name: "dashboard", duration: 15 },
    { name: "tech", duration: 10 },
    { name: "usecases", duration: 15 },
    { name: "cta", duration: 10 }
  ];

  let elapsed = 0;
  for (const scene of scenes) {
    if (currentTime < elapsed + scene.duration) {
      currentScene = scene.name;
      timeInScene = currentTime - elapsed;
      sceneProgress = timeInScene / scene.duration;
      break;
    }
    elapsed += scene.duration;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.lightGray }}>
      {/* Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.lightGray
      }} />

      {/* Scene Content */}
      {renderScene(currentScene, sceneProgress)}

      {/* Subtitle Area */}
      <div style={{
        position: 'absolute',
        bottom: 100,
        left: 0,
        width: '100%',
        textAlign: 'center',
        padding: '0 50px',
        boxSizing: 'border-box'
      }}>
        <Text
          str={getVoiceoverText(currentTime)}
          size={42}
          fontFamily="Arial"
          color={COLORS.darkGray}
          lineHeight={50}
          maxWidth={COMPOSITION_WIDTH - 100}
          textAlign="center"
          style={{
            backgroundColor: "rgba(255,255,255,0.8)",
            padding: "20px",
            borderRadius: "12px",
            display: "inline-block"
          }}
        />
      </div>

      {/* Progress Bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: `${progress * 100}%`,
        height: '4px',
        backgroundColor: COLORS.primaryBlue,
      }} />
    </AbsoluteFill>
  );
};

// Scene renderer
const renderScene = (sceneName, progress) => {
  switch (sceneName) {
    case "intro":
      return renderIntro(progress);
    case "solution":
      return renderSolution(progress);
    case "shadow":
      return renderShadowAnalysis(progress);
    case "score":
      return renderScoreCalculation(progress);
    case "financial":
      return renderFinancialProjections(progress);
    case "whatif":
      return renderWhatIfSimulation(progress);
    case "dashboard":
      return renderDashboard(progress);
    case "tech":
      return renderTechnicalArchitecture(progress);
    case "usecases":
      return renderUseCases(progress);
    case "cta":
      return renderCallToAction(progress);
    default:
      return renderIntro(progress);
  }
};

// Scene implementations
const renderIntro = (progress) => {
  return (
    <Group>
      {/* Mumbai skyline placeholder */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage: 'url(https://images.unsplash.com/photo-1558361102-6f61aaddaa7e?auto=format&fit=crop&w=1920&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.6
      }} />

      {/* Animated rooftop dots */}
      <Group>
        {Array.from({length: 8}, (_, i) => {
          const angle = (i / 8) * Math.PI * 2 + progress * 2;
          const radius = 300 + Math.sin(progress * 3) * 50;
          return (
            <Circle
              key={i}
              x={COMPOSITION_WIDTH/2 + Math.cos(angle) * radius}
              y={COMPOSITION_HEIGHT/2 + Math.sin(angle) * radius}
              radius={8 + Math.sin(progress * 5 + i) * 3}
              color={COLORS.successGreen}
              opacity={0.7}
            />
          );
        })}
      </Group>

      {/* Title */}
      <Text
        str="Mumbai’s Solar Potential"
        x={COMPOSITION_WIDTH/2}
        y={200}
        size={80}
        fontFamily="Arial Bold"
        color={COLORS.primaryBlue}
        textAlign="center"
      />

      <Text
        str="12,500+ rooftops. Manual assessment is impossible at scale."
        x={COMPOSITION_WIDTH/2}
        y={320}
        size={36}
        fontFamily="Arial"
        color={COLORS.darkGray}
        textAlign="center"
        maxWidth={1600}
      />
    </Group>
  );
};

const renderSolution = (progress) => {
  return (
    <Group>
      {/* Split background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '50%',
        height: '100%',
        backgroundColor: COLORS.lightGray,
        opacity: 0.8
      }} />

      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '50%',
        height: '100%',
        backgroundColor: COLORS.white,
        opacity: 0.9
      }} />

      {/* Left: Animated map */}
      <Group>
        {/* Building highlight pulse */}
        <Circle
          x={COMPOSITION_WIDTH*0.25}
          y={COMPOSITION_HEIGHT*0.4}
          radius={60 + Math.sin(progress * 10) * 15}
          color={COLORS.successGreen}
          opacity={0.4}
        />

        {/* Sun moving */}
        <Group>
          <Circle
            x={150 + Math.cos(progress * 2 * Math.PI) * 400}
            y={150 + Math.sin(progress * 2 * Math.PI) * 300}
            radius={30}
            color={COLORS.warningAmber}
          />
          <Text
            str="☀️"
            x={150 + Math.cos(progress * 2 * Math.PI) * 400}
            y={150 + Math.sin(progress * 2 * Math.PI) * 300}
            size={50}
            textBaseline="middle"
            textAlign="center"
          />
        </Group>

        {/* Building */}
        <Text
          str="🏢"
          x={COMPOSITION_WIDTH*0.25}
          y={COMPOSITION_HEIGHT*0.4}
          size={80}
          textBaseline="middle"
          textAlign="center"
        />
      </Group>

      {/* Right: Flowing data */}
      <Group>
        <Text
          str="SolarSight: Automated Rooftop Analysis"
          x={COMPOSITION_WIDTH*0.75}
          y={150}
          size={40}
          fontFamily="Arial Bold"
          color={COLORS.primaryBlue}
          textAlign="center"
        />

        {/* Data flowing to icons */}
        {(() => {
          const metrics = [
            {label: "Capacity", color: COLORS.successGreen, symbol: "⚡"},
            {label: "Generation", color: COLORS.warningAmber, symbol: "🔋"},
            {label: "Savings", color: COLORS.errorRed, symbol: "💰"},
            {label: "Payback", color: COLORS.primaryBlue, symbol: "⏱️"},
            {label: "Offset", color: COLORS.successGreen, symbol: "☁️"}
          ];
          return metrics;
        })().map((metric, i) => {
          const angle = (i / 5) * Math.PI * 2;
          const centerX = COMPOSITION_WIDTH * 0.5;
          const centerY = COMPOSITION_HEIGHT * 0.5;
          const radius = 250;
          const targetX = centerX + Math.cos(angle) * radius;
          const targetY = centerY + Math.sin(angle) * radius;
          const animProgress = Math.min(progress * 2, 1);

          return (
            <Group key={i}>
              <Line
                x1={centerX}
                y1={centerY}
                x2={centerX + Math.cos(angle) * radius * animProgress}
                y2={centerY + Math.sin(angle) * radius * animProgress}
                strokeWidth={2}
                color={metric.color}
                opacity={0.6}
              />
              <Group
                x={centerX + Math.cos(angle) * radius}
                y={centerY + Math.sin(angle) * radius}
              >
                <Text
                  str={metric.symbol}
                  size={30}
                  color={metric.color}
                  textBaseline="middle"
                  textAlign="center"
                />
                <Text
                  str={metric.label}
                  x={0}
                  y={40}
                  size={18}
                  fontFamily="Arial"
                  color={COLORS.darkGray}
                  textAlign="center"
                />
              </Group>
            </Group>
          );
        })}
        </Group>

        <Text
          str="SolarSight automates rooftop solar assessment in seconds"
          x={COMPOSITION_WIDTH/2}
          y={COMPOSITION_HEIGHT - 100}
          size={32}
          fontFamily="Arial"
          color={COLORS.darkGray}
          textAlign="center"
          maxWidth={1600}
        />
      </Group>
  );
};

const renderShadowAnalysis = (progress) => {
  return (
    <Group>
      <Text
        str="Shadow Analysis"
        x={COMPOSITION_WIDTH/2}
        y={200}
        size={56}
        fontFamily="Arial Bold"
        color={COLORS.primaryBlue}
        textAlign="center"
      />

      {/* Shadow visualization */}
      <Group>
        {/* Base building */}
        <Text
          str="🏢"
          x={COMPOSITION_WIDTH/2}
          y={COMPOSITION_HEIGHT/2}
          size={100}
          textBaseline="middle"
          textAlign="center"
          opacity={0.8}
        />

        {/* Shadow from neighboring buildings */}
        <Group>
          {Array.from({length: 3}, (_, i) => {
            const offsetX = (i - 1) * 80;
            const offsetY = 30 + i * 15;
            return (
              <Text
                key={i}
                str="▓▓▓"
                x={COMPOSITION_WIDTH/2 + offsetX}
                y={COMPOSITION_HEIGHT/2 + offsetY}
                size={24}
                textBaseline="middle"
                textAlign="center"
                color={COLORS.darkGray}
                opacity={0.6}
              />
            );
          })}
        </Group>

        {/* Sun position indicator */}
        <Group>
          <Circle
            x={150 + Math.cos(progress * 2 * Math.PI) * 200}
            y={150 + Math.sin(progress * 2 * Math.PI) * 150}
            radius={20}
            color={COLORS.warningAmber}
          />
          <Text
            str="☀️"
            x={150 + Math.cos(progress * 2 * Math.PI) * 200}
            y={150 + Math.sin(progress * 2 * Math.PI) * 150}
            size={30}
            textBaseline="middle"
            textAlign="center"
          />
        </Group>

        {/* Shadow metrics */}
        <Text
          str="Shadow Impact: 41% Reduction"
          x={COMPOSITION_WIDTH/2}
          y={COMPOSITION_HEIGHT - 100}
          size={28}
          fontFamily="Arial"
          color={COLORS.darkGray}
          textAlign="center"
          maxWidth={1600}
        />
      </Group>
    </Group>
  );
};

const renderScoreCalculation = (progress) => {
  return (
    <Group>
      <Text
        str="Solar Suitability Score Calculation"
        x={COMPOSITION_WIDTH/2}
        y={180}
        size={56}
        fontFamily="Arial Bold"
        color={COLORS.primaryBlue}
        textAlign="center"
      />

      {/* Score breakdown */}
      <Group>
        {(() => {
          const factors = [
            {name: "Sunlit Exposure", weight: 50, value: 75, color: COLORS.successGreen},
            {name: "Roof Area", weight: 20, value: 80, color: COLORS.warningAmber},
            {name: "Building Height", weight: 10, value: 60, color: COLORS.errorRed},
            {name: "Solar Irradiance", weight: 20, value: 70, color: COLORS.primaryBlue}
          ];
          return factors;
        })().map((factor, i) => {
          const xPos = COMPOSITION_WIDTH * 0.2;
          const yPos = 280 + i * 80;
          const animatedValue = Math.floor(factor.value * progress);
          const weightedValue = Math.floor((factor.value * factor.weight / 100) * progress);

          return (
            <Group key={i}>
              <Text
                str={factor.name}
                x={xPos}
                y={yPos}
                size={20}
                fontFamily="Arial"
                color={COLORS.darkGray}
                textAlign="left"
              />

              <Text
                str={`Weight: ${factor.weight}%`}
                x={xPos + 200}
                y={yPos}
                size={18}
                fontFamily="Arial"
                color={COLORS.darkGray}
                textAlign="left"
              />

              <Text
                str={animatedValue.toString()}
                x={xPos + 350}
                y={yPos}
                size={24}
                fontFamily="Arial Bold"
                color={factor.color}
                textAlign="center"
              />

              <Text
                str="/ 100"
                x={xPos + 400}
                y={yPos}
                size={24}
                fontFamily="Arial"
                color={COLORS.darkGray}
                textAlign="left"
              />

              {/* Visual bar */}
              <div style={{
                position: 'absolute',
                left: xPos + 450,
                top: yPos - 10,
                width: 200,
                height: 20,
                backgroundColor: COLORS.lightGray,
                borderRadius: '10px'
              }} />
              <div style={{
                position: 'absolute',
                left: xPos + 450,
                top: yPos - 10,
                width: `${Math.min(animatedValue, 100)}%`,
                height: 20,
                backgroundColor: factor.color,
                borderRadius: '10px'
              }} />

              {/* Weighted contribution */}
              <Text
                str={`→ ${weightedValue} pts`}
                x={xPos + 680}
                y={yPos}
                size={20}
                fontFamily="Arial"
                color={COLORS.darkGray}
                textAlign="left"
              />
            </Group>
          );
        })}

        {/* Total score */}
        <Group>
          <Text
            str="TOTAL SCORE"
            x={COMPOSITION_WIDTH/2}
            y={600}
            size={24}
            fontFamily="Arial Bold"
            color={COLORS.darkGray}
            textAlign="center"
          />
          <Text
            str="68/100"
            x={COMPOSITION_WIDTH/2}
            y={640}
            size={72}
            fontFamily="Arial Bold"
            color={COLORS.warningAmber}
            textAlign="center"
          />
          <Text
            str="Moderately Suitable"
            x={COMPOSITION_WIDTH/2}
            y={720}
            size={24}
            fontFamily="Arial"
            color={COLORS.warningAmber}
            textAlign="center"
          />
        </Group>
      </Group>

      <Text
        str="Each factor is weighted to calculate the final solar suitability score"
        x={COMPOSITION_WIDTH/2}
        y={COMPOSITION_HEIGHT - 100}
        size={28}
        fontFamily="Arial"
        color={COLORS.darkGray}
        textAlign="center"
        maxWidth={1600}
      />
    </Group>
  );
};

const renderFinancialProjections = (progress) => {
  return (
    <Group>
      <Text
        str="Financial & Environmental Projections"
        x={COMPOSITION_WIDTH/2}
        y={180}
        size={56}
        fontFamily="Arial Bold"
        color={COLORS.primaryBlue}
        textAlign="center"
      />

      {/* Metrics with counting animation */}
      <Group>
        {(() => {
          const metrics = [
            {label: "Capacity", value: 150, unit: "kWp", color: COLORS.successGreen, symbol: "⚡"},
            {label: "Annual Generation", value: 225, unit: "MWh/yr", color: COLORS.warningAmber, symbol: "🔋"},
            {label: "Annual Savings", value: 1575000, unit: "₹/yr", color: COLORS.errorRed, symbol: "💰"},
            {label: "Payback Period", value: 6, unit: "years", color: COLORS.primaryBlue, symbol: "⏱️"},
            {label: "CO₂ Offset", value: 184.5, unit: "t/yr", color: COLORS.successGreen, symbol: "☁️"}
          ];
          return metrics;
        })().map((metric, i) => {
          const xPos = COMPOSITION_WIDTH * (0.2 + i * 0.16);
          const yPos = COMPOSITION_HEIGHT * 0.4;
          const animatedValue = Math.floor(metric.value * progress);

          return (
            <Group key={i}>
              <Circle
                x={xPos}
                y={yPos}
                radius={60}
                color={metric.color}
                opacity={0.2}
              />
              <Circle
                x={xPos}
                y={yPos}
                radius={50}
                color={metric.color}
                opacity={0.1}
              />
              <Text
                str={metric.symbol}
                x={xPos}
                y={yPos}
                size={70}
                textBaseline="middle"
                textAlign="center"
                color={COLORS.white}
              />
              <Text
                str={animatedValue.toLocaleString()}
                x={xPos}
                y={yPos + 80}
                size={32}
                fontFamily="Arial Bold"
                color={metric.color}
                textAlign="center"
              />
              <Text
                str={metric.unit}
                x={xPos}
                y={yPos + 120}
                size={20}
                fontFamily="Arial"
                color={COLORS.darkGray}
                textAlign="center"
              />
              <Text
                str={metric.label}
                x={xPos}
                y={yPos + 150}
                size={20}
                fontFamily="Arial"
                color={COLORS.darkGray}
                textAlign="center"
                maxWidth={120}
              />
            </Group>
          );
        })}
      </Group>
      <Text
        str="Estimates system capacity, generation, savings, payback & carbon offset"
        x={COMPOSITION_WIDTH/2}
        y={COMPOSITION_HEIGHT - 100}
        size={28}
        fontFamily="Arial"
        color={COLORS.darkGray}
        textAlign="center"
        maxWidth={1600}
      />
    </Group>
  );
};

const renderWhatIfSimulation = (progress) => {
  return (
    <Group>
      <Text
        str="What-If Simulation: Shadow Impact"
        x={COMPOSITION_WIDTH/2}
        y={180}
        size={56}
        fontFamily="Arial Bold"
        color={COLORS.primaryBlue}
        textAlign="center"
      />

      {/* Split screen */}
      <div style={{
        position: 'absolute',
        top: 250,
        left: 150,
        width: COMPOSITION_WIDTH - 300,
        height: 300,
        border: `2px solid ${COLORS.primaryBlue}`,
        borderRadius: '16px',
        overflow: 'hidden'
      }} />

      {/* Left: With neighbors (current) */}
      <div style={{
        position: 'absolute',
        top: 250,
        left: 150,
        width: (COMPOSITION_WIDTH - 300)/2 - 10,
        height: 300,
        backgroundColor: '#f8f9fa'
      }} />

      {/* Right: Without neighbors (ideal) */}
      <div style={{
        position: 'absolute',
        top: 250,
        left: 150 + (COMPOSITION_WIDTH - 300)/2 + 10,
        width: (COMPOSITION_WIDTH - 300)/2 - 10,
        height: 300,
        backgroundColor: '#e8f5e9'
      }} />

      {/* Left building with shadows */}
      <Group>
        <Text
          str="🏢"
          x={250 + (COMPOSITION_WIDTH - 450)/4}
          y={400}
          size={100}
          textBaseline="middle"
          textAlign="center"
          opacity={0.7}
        />
        <Group>
          {Array.from({length: 5}, (_, i) => {
            const offsetX = (i - 2) * 15;
            const offsetY = -20 - i * 10;
            return (
              <Text
                key={i}
                str="☁️"
                x={250 + (COMPOSITION_WIDTH - 450)/4 + offsetX}
                y={400 + offsetY}
                size={24}
                textBaseline="middle"
                textAlign="center"
              />
            );
          })}
        </Group>
        <Text
          str="59/100"
          x={250 + (COMPOSITION_WIDTH - 450)/4}
          y={520}
          size={36}
          fontFamily="Arial Bold"
          color={COLORS.warningAmber}
          textAlign="center"
        />
      </Group>

      {/* Right building without shadows */}
      <Group>
        <Text
          str="🏢"
          x={250 + (COMPOSITION_WIDTH - 450)*3/4}
          y={400}
          size={100}
          textBaseline="middle"
          textAlign="center"
          opacity={0.9}
        />
        <Group>
          {Array.from({length: 5}, (_, i) => {
            const offsetX = (i - 2) * 15;
            const offsetY = -20 - i * 10;
            return (
              <Text
                key={i}
                str="☀️"
                x={250 + (COMPOSITION_WIDTH - 450)*3/4 + offsetX}
                y={400 + offsetY}
                size={24}
                textBaseline="middle"
                textAlign="center"
              />
            );
          })}
        </Group>
        <Text
          str="77/100"
          x={250 + (COMPOSITION_WIDTH - 450)*3/4}
          y={520}
          size={36}
          fontFamily="Arial Bold"
          color={COLORS.successGreen}
          textAlign="center"
        />
      </Group>

      {/* Impact arrow */}
      <Group>
        <Line
          x1={COMPOSITION_WIDTH/2 - 30}
          y1={450}
          x2={COMPOSITION_WIDTH/2 + 30}
          y2={450}
          strokeWidth={6}
          color={COLORS.errorRed}
          cap="round"
        />
        <Polygon
          points={[
            [COMPOSITION_WIDTH/2 + 30, 440],
            [COMPOSITION_WIDTH/2 + 30, 460],
            [COMPOSITION_WIDTH/2 + 50, 450]
          ]}
          color={COLORS.errorRed}
        />
        <Text
          str="-18 points"
          x={COMPOSITION_WIDTH/2}
          y={420}
          size={24}
          fontFamily="Arial Bold"
          color={COLORS.errorRed}
          textAlign="center"
        />
      </Group>

      <Text
        str="See how neighboring buildings impact solar potential"
        x={COMPOSITION_WIDTH/2}
        y={COMPOSITION_HEIGHT - 100}
        size={28}
        fontFamily="Arial"
        color={COLORS.darkGray}
        textAlign="center"
        maxWidth={1600}
      />
    </Group>
  );
};

const renderDashboard = (progress) => {
  return (
    <Group>
      <Text
        str="Analysis Dashboard"
        x={COMPOSITION_WIDTH/2}
        y={180}
        size={56}
        fontFamily="Arial Bold"
        color={COLORS.primaryBlue}
        textAlign="center"
      />

      {/* Building cards */}
      <Group>
        {(() => {
          const cards = [];
          for (let i = 0; i < 6; i++) {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const xPos = 250 + col * 450;
            const yPos = 280 + row * 180;
            const score = 45 + i * 10; // 45, 55, 65, 75, 85, 95
            const scoreColor = score >= 80 ? COLORS.successGreen :
                               score >= 65 ? COLORS.warningAmber :
                               COLORS.errorRed;
            const suitability = score >= 80 ? "Suitable" :
                                score >= 65 ? "Moderate" : "Unsuitable";
            cards.push({key: i, xPos, yPos, score, scoreColor, suitability});
          }
          return cards;
        })().map(card => (
          <Group key={card.key}>
            <div style={{
              position: 'absolute',
              left: card.xPos - 150,
              top: card.yPos - 60,
              width: 300,
              height: 120,
              backgroundColor: COLORS.white,
              border: `2px solid ${card.scoreColor}`,
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              opacity: 0.9
            }} />

            <Text
              str={`Building ${card.key + 1}`}
              x={card.xPos}
              y={card.yPos}
              size={20}
              fontFamily="Arial"
              color={COLORS.darkGray}
              textAlign="center"
            />

            <Text
              str={card.score.toString()}
              x={card.xPos}
              y={card.yPos + 25}
              size={32}
              fontFamily="Arial Bold"
              color={card.scoreColor}
              textAlign="center"
            />

            <Text
              str={card.suitability}
              x={card.xPos}
              y={card.yPos + 50}
              size={16}
              fontFamily="Arial"
              color={COLORS.darkGray}
              textAlign="center"
            />

            {/* PDF icon in corner */}
            <Text
              str="📄"
              x={card.xPos + 100}
              y={card.yPos - 20}
              size={20}
              textBaseline="middle"
              textAlign="center"
              opacity={0.7}
            />
          </Group>
        ))}
      </Group>

      <Text
        str="Filter, sort, and export branded PDF reports for each analysis"
        x={COMPOSITION_WIDTH/2}
        y={COMPOSITION_HEIGHT - 100}
        size={28}
        fontFamily="Arial"
        color={COLORS.darkGray}
        textAlign="center"
        maxWidth={1600}
      />
    </Group>
  );
};

const renderTechnicalArchitecture = (progress) => {
  return (
    <Group>
      <Text
        str="Technical Architecture"
        x={COMPOSITION_WIDTH/2}
        y={180}
        size={56}
        fontFamily="Arial Bold"
        color={COLORS.primaryBlue}
        textAlign="center"
      />

      {/* Architecture diagram flow */}
      <Group>
        {(() => {
          const layers = [
            {name: "User Interface", x: COMPOSITION_WIDTH/2, y: 250, color: COLORS.lightGray},
            {name: "React/Vite Frontend", x: COMPOSITION_WIDTH/2, y: 350, color: COLORS.primaryBlue},
            {name: "ArcGIS JS API", x: COMPOSITION_WIDTH/2, y: 450, color: COLORS.warningAmber},
            {name: "Node.js/Express API", x: COMPOSITION_WIDTH/2, y: 550, color: COLORS.successGreen},
            {name: "PostgreSQL Database", x: COMPOSITION_WIDTH/2, y: 650, color: COLORS.errorRed}
          ];
          return layers;
        })().map((layer, i) => {
          return (
            <Group key={i}>
              <div style={{
                position: 'absolute',
                left: COMPOSITION_WIDTH/2 - 150,
                top: layer.y - 30,
                width: 300,
                height: 60,
                backgroundColor: layer.color,
                opacity: 0.2 + (progress * 0.8 * (i + 1) / 5)
              }} />
              <Text
                str={layer.name}
                x={layer.x}
                y={layer.y}
                size={20}
                fontFamily="Arial"
                color={COLORS.white}
                textBaseline="middle"
                textAlign="center"
              />
            </Group>
          );
        })}

        {/* Connecting lines */}
        <Group>
          {(() => {
            const lines = [];
            const layers = [
              {name: "User Interface", y: 250},
              {name: "React/Vite Frontend", y: 350},
              {name: "ArcGIS JS API", y: 450},
              {name: "Node.js/Express API", y: 550},
              {name: "PostgreSQL Database", y: 650}
            ];
            for (let i = 0; i < layers.length - 1; i++) {
              lines.push({i, y1: layers[i].y + 30, y2: layers[i + 1].y - 30});
            }
            return lines;
          })().map(line => {
            const progressFactor = Math.min(progress * 5 / (line.i + 1), 1);
            return (
              <Line
                key={line.i}
                x1={COMPOSITION_WIDTH/2}
                y1={line.y1}
                x2={COMPOSITION_WIDTH/2}
                y2={line.y2}
                strokeWidth={3}
                color={COLORS.primaryBlue}
                opacity={progressFactor}
                style={{
                  strokeDasharray: "10,5",
                  strokeDashoffset: `${progressFactor * 20}`
                }}
              />
            );
          })}
        </Group>
        </Group>

        <Text
          str="Built on TrueGeoMap platform with modern web technologies"
          x={COMPOSITION_WIDTH/2}
          y={COMPOSITION_HEIGHT - 100}
          size={28}
          fontFamily="Arial"
          color={COLORS.darkGray}
          textAlign="center"
          maxWidth={1600}
        />
      </Group>
    );
};

const renderUseCases = (progress) => {
  return (
    <Group>
      <Text
        str="Real-World Use Cases"
        x={COMPOSITION_WIDTH/2}
        y={180}
        size={56}
        fontFamily="Arial Bold"
        color={COLORS.primaryBlue}
        textAlign="center"
      />

      {/* Use case cards */}
      <Group>
        {(() => {
          const useCases = [
            {icon: "🏛️", label: "Municipal Policy", desc: "Target solar incentives to high-potential wards"},
            {icon: "👨‍👩‍👧‍👦", label: "Citizen Portal", desc: "Residents check rooftop score before net metering"},
            {icon: "🏭", label: "Developer Feasibility", desc: "Solar EPC companies run quick pre-assessments"},
            {icon: "🏘️", label: "Urban Planning", desc: "Factor solar potential into new development approvals"}
          ];
          return useCases;
        })().map((uc, i) => {
          const xPos = COMPOSITION_WIDTH * (0.25 + (i % 2) * 0.5);
          const yPos = COMPOSITION_HEIGHT * (0.4 + Math.floor(i/2) * 0.25);
          const appearProgress = Math.min(progress * 2 - i * 0.5, 1);

          if (appearProgress <= 0) return null;

          return (
            <Group key={i} style={{opacity: appearProgress}}>
              <Circle
                x={xPos}
                y={yPos}
                radius={60}
                color={COLORS.lightGray}
                opacity={0.5}
              />
              <Text
                str={uc.icon}
                x={xPos}
                y={yPos}
                size={50}
                textBaseline="middle"
                textAlign="center"
              />
              <Text
                str={uc.label}
                x={xPos}
                y={yPos + 80}
                size={24}
                fontFamily="Arial Bold"
                color={COLORS.darkGray}
                textAlign="center"
              />
              <Text
                str={uc.desc}
                x={xPos}
                y={yPos + 110}
                size={18}
                fontFamily="Arial"
                color={COLORS.darkGray}
                textAlign="center"
                maxWidth={180}
              />
            </Group>
          );
        }).filter(Boolean)}
      </Group>

      <Text
        str="SolarSight serves multiple stakeholders across Mumbai's municipal ecosystem"
        x={COMPOSITION_WIDTH/2}
        y={COMPOSITION_HEIGHT - 100}
        size={28}
        fontFamily="Arial"
        color={COLORS.darkGray}
        textAlign="center"
        maxWidth={1600}
      />
    </Group>
  );
};

const renderCallToAction = (progress) => {
  return (
    <Group>
      {/* Pulsing background circles */}
      {Array.from({length: 3}, (_, i) => {
          const pulseSize = 180 + Math.sin(progress * 4 + i) * 40 * (i + 1);
          const opacity = 0.1 + (Math.sin(progress * 4 + i) + 1) / 4 * (i + 1) * 0.2;
          return (
            <Circle
              key={i}
              x={COMPOSITION_WIDTH/2}
              y={COMPOSITION_HEIGHT/2}
              radius={pulseSize}
              color={COLORS.primaryBlue}
              opacity={opacity}
            />
          );
        })}

      {/* Main button */}
      <div style={{
        position: 'absolute',
        left: COMPOSITION_WIDTH/2 - 220,
        top: COMPOSITION_HEIGHT/2 - 60,
        width: 440,
        height: 120,
        backgroundColor: COLORS.primaryBlue,
        borderRadius: '30px',
        boxShadow: '0 8px 24px rgba(30,58,95,0.3)'
      }} />

      <Text
        str="Analyze Your Rooftop"
        x={COMPOSITION_WIDTH/2}
        y={COMPOSITION_HEIGHT/2}
        size={36}
        fontFamily="Arial Bold"
        color={COLORS.white}
        textBaseline="middle"
        textAlign="center"
      />

      <Text
        str="With SolarSight, Mumbai’s solar potential is just a click away"
        x={COMPOSITION_WIDTH/2}
        y={COMPOSITION_HEIGHT/2 + 100}
        size={24}
        fontFamily="Arial"
        color={COLORS.darkGray}
        textAlign="center"
        maxWidth={1600}
      />

      <Text
        str="Discover how your rooftop can contribute to a greener, more sustainable city"
        x={COMPOSITION_WIDTH/2}
        y={COMPOSITION_HEIGHT/2 + 130}
        size={20}
        fontFamily="Arial"
        color={COLORS.darkGray}
        textAlign="center"
        maxWidth={1600}
      />
    </Group>
  );
};

// Voice-over text synchronized with scenes
const getVoiceoverText = (time) => {
  const voiceoverMap = [
    {start: 0, end: 20, text: "Mumbai’s skyline is dotted with thousands of rooftops, each a potential site for solar energy. But manually evaluating each building for solar panel installation—considering roof area, shadow from neighboring high-rises, orientation, and sunlight hours—is simply impossible at scale."},
    {start: 20, end: 40, text: "Enter SolarSight—an intelligent geospatial tool that automates this process. By combining ArcGIS Enterprise's 3D city model with real-time shadow simulation, SolarSight computes a solar suitability score, estimates energy generation, and projects financial savings—in seconds."},
    {start: 40, end: 55, text: "First, SolarSight simulates the sun’s position for every hour of daylight. It calculates the shadow cast by surrounding buildings on each rooftop, determining the percentage of area under shadow and deriving the 'sunny hours' metric."},
    {start: 55, end: 70, text: "The tool then computes a composite Solar Suitability Score from 0 to 100, weighting sunlit exposure at 50%, roof area at 20%, building height at 10, and solar irradiance at 20. Scores are categorized as Suitable (60–100), Moderately Suitable (35–59), or Unsuitable (0–34)."},
    {start: 70, end: 85, text: "From the score, SolarSight estimates the system’s capacity in kilowatts-peak, annual energy generation, financial savings based on local tariffs, payback period, and carbon offset using India’s grid emission factor."},
    {start: 85, end: 100, text: "Users can run a What-If simulation to see how much shadow from neighboring buildings affects the score. This helps planners identify where tall neighbors are the limiting factor and prioritize interventions."},
    {start: 100, end: 115, text: "All analyzed buildings are saved to an interactive dashboard. Users can filter by name, sort by score or date, and export a branded PDF report for each building—complete with a 3D screenshot, metrics, and projection tables."},
    {start: 115, end: 125, text: "SolarSight is built as a tool within the TrueGeoMap platform, using React and Vite for the frontend, ArcGIS JS API for 3D rendering and shadow analysis, and a Node.js/Express backend with PostgreSQL for saving analyses. It leverages the platform’s existing authentication, routing, and export utilities."},
    {start: 125, end: 140, text: "SolarSight supports multiple use cases: municipal officers can target incentives to wards with high solar potential; citizens can check their rooftop score before applying for net metering; solar EPC companies can run quick feasibility checks; and urban planners can factor rooftop solar into new development approvals."},
    {start: 140, end: 150, text: "With SolarSight, Mumbai’s solar potential is just a click away. Discover how your rooftop can contribute to a greener, more sustainable city."}
  ];

  const current = voiceoverMap.find(segment => time >= segment.start && time < segment.end);
  return current ? current.text : "";
};

export default SolarSightVideo;