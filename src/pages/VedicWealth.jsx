import React, { useState } from 'react';
import {
  Sparkles,
  Sun,
  Shield,
  BookOpen,
  Trophy,
  Users,
  Utensils,
  Coins,
  Heart,
  RotateCcw,
  Award,
  Zap
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip
} from 'recharts';

const WEALTH_FORMS = [
  {
    id: 'adi',
    sanskritName: 'Adi Lakshmi',
    englishTitle: 'Spiritual Wealth',
    description: 'The inner peace and awareness of your true divine source.',
    icon: Sparkles,
    defaultScore: 82,
    accentColor: '#8B5CF6'
  },
  {
    id: 'dhana',
    sanskritName: 'Dhana Lakshmi',
    englishTitle: 'Material Wealth',
    description: 'Money, gold, and financial resources.',
    icon: Coins,
    defaultScore: 78,
    accentColor: '#10B981'
  },
  {
    id: 'dhanya',
    sanskritName: 'Dhanya Lakshmi',
    englishTitle: 'Nourishment',
    description: 'Food, grains, and agricultural abundance.',
    icon: Utensils,
    defaultScore: 85,
    accentColor: '#F59E0B'
  },
  {
    id: 'gaja',
    sanskritName: 'Gaja Lakshmi',
    englishTitle: 'Power and Strength',
    description: 'Influence, resources, and royal dignity.',
    icon: Shield,
    defaultScore: 70,
    accentColor: '#3B82F6'
  },
  {
    id: 'santana',
    sanskritName: 'Santana Lakshmi',
    englishTitle: 'Legacy',
    description: 'Family, children, and the continuity of generations.',
    icon: Users,
    defaultScore: 88,
    accentColor: '#EC4899'
  },
  {
    id: 'dhairya',
    sanskritName: 'Dhairya Lakshmi',
    englishTitle: 'Courage',
    description: 'Patience, mental strength, and resilience in hard times.',
    icon: Heart,
    defaultScore: 75,
    accentColor: '#EF4444'
  },
  {
    id: 'vijaya',
    sanskritName: 'Vijaya Lakshmi',
    englishTitle: 'Success',
    description: 'Victory and the ability to overcome life\'s obstacles.',
    icon: Trophy,
    defaultScore: 80,
    accentColor: '#6366F1'
  },
  {
    id: 'vidya',
    sanskritName: 'Vidya Lakshmi',
    englishTitle: 'Knowledge',
    description: 'Education, wisdom, and learning.',
    icon: BookOpen,
    defaultScore: 92,
    accentColor: '#14B8A6'
  }
];

export function VedicWealth() {
  const [scores, setScores] = useState(() => {
    const initial = {};
    WEALTH_FORMS.forEach(item => {
      initial[item.id] = item.defaultScore;
    });
    return initial;
  });

  const handleScoreChange = (id, value) => {
    setScores(prev => ({
      ...prev,
      [id]: Math.min(100, Math.max(1, parseInt(value, 10) || 1))
    }));
  };

  const getRangeConfig = (score) => {
    if (score <= 40) {
      return {
        label: 'Emerging / Needs Focus',
        color: '#EF4444',
        bgColor: '#FEF2F2',
        borderColor: '#FECDD3',
        badgeBg: '#FEE2E2',
        badgeColor: '#991B1B'
      };
    } else if (score <= 75) {
      return {
        label: 'Balanced & Flourishing',
        color: '#D97706',
        bgColor: '#FEF3C7',
        borderColor: '#FDE68A',
        badgeBg: '#FEF3C7',
        badgeColor: '#92400E'
      };
    } else {
      return {
        label: 'Abundant & Mastered',
        color: '#059669',
        bgColor: '#ECFDF5',
        borderColor: '#A7F3D0',
        badgeBg: '#D1FAE5',
        badgeColor: '#065F46'
      };
    }
  };

  // Calculate average overall score
  const totalScore = Object.values(scores).reduce((sum, v) => sum + v, 0);
  const averageScore = Math.round(totalScore / WEALTH_FORMS.length);
  const overallRange = getRangeConfig(averageScore);

  // Radar chart dataset
  const chartData = WEALTH_FORMS.map(item => ({
    subject: item.sanskritName,
    fullMark: 100,
    Score: scores[item.id] || 0
  }));

  // Presets
  const applyPreset = (targetScore) => {
    const updated = {};
    WEALTH_FORMS.forEach(item => {
      updated[item.id] = targetScore;
    });
    setScores(updated);
  };

  const resetToDefaults = () => {
    const reset = {};
    WEALTH_FORMS.forEach(item => {
      reset[item.id] = item.defaultScore;
    });
    setScores(reset);
  };

  return (
    <div className="page-wrapper" style={{ paddingBottom: '40px' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
        borderRadius: '20px',
        padding: '32px',
        color: 'white',
        marginBottom: '28px',
        boxShadow: '0 10px 25px -5px rgba(67, 56, 202, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
              <Sun size={16} color="#FBBF24" />
              <span>Vedic Philosophy & Life Abundance</span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
              The Eight Forms of Wealth (Ashta Lakshmi)
            </h1>
            <p style={{ fontSize: '14px', color: '#E0E7FF', margin: 0, maxWidth: '650px', lineHeight: '1.5' }}>
              True prosperity extends beyond financial currency. Explore and assess your self-perceived balance across spiritual, material, physical, relational, and intellectual dimensions of life.
            </p>
          </div>

          {/* Overall Score Badge */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '20px 28px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            textAlign: 'center',
            minWidth: '200px'
          }}>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', tracking: '1px', fontWeight: 700, color: '#C7D2FE' }}>
              Harmony Index
            </span>
            <div style={{ fontSize: '42px', fontWeight: 900, color: '#FBBF24', margin: '4px 0' }}>
              {averageScore}<span style={{ fontSize: '20px', color: '#E0E7FF' }}>/100</span>
            </div>
            <span style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor: overallRange.badgeBg,
              color: overallRange.badgeColor
            }}>
              {overallRange.label}
            </span>
          </div>
        </div>
      </div>

      {/* Preset Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => applyPreset(50)}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '20px', fontSize: '12px' }}
          >
            Preset: Balanced (50)
          </button>
          <button
            onClick={() => applyPreset(85)}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '20px', fontSize: '12px' }}
          >
            Preset: Abundant (85)
          </button>
          <button
            onClick={resetToDefaults}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '20px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCcw size={14} /> Reset Defaults
          </button>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
            <span style={{ color: '#94A3B8' }}>1 - 40 (Emerging)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#D97706' }} />
            <span style={{ color: '#94A3B8' }}>41 - 75 (Balanced)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#059669' }} />
            <span style={{ color: '#94A3B8' }}>76 - 100 (Abundant)</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Radar Chart + 8 Wealth Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', marginBottom: '28px' }}>
        
        {/* 8 Wealth Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {WEALTH_FORMS.map(item => {
            const Icon = item.icon;
            const score = scores[item.id] || 1;
            const range = getRangeConfig(score);

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  border: `1px solid ${range.borderColor}`,
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      padding: '10px',
                      borderRadius: '12px',
                      backgroundColor: `${item.accentColor}15`,
                      color: item.accentColor
                    }}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#F8FAFC' }}>
                        {item.sanskritName}
                      </h3>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8' }}>
                        {item.englishTitle}
                      </span>
                    </div>
                  </div>

                  {/* Range Badge */}
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 800,
                    backgroundColor: range.badgeBg,
                    color: range.badgeColor
                  }}>
                    {score}/100
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.5', margin: '0 0 16px 0', minHeight: '36px' }}>
                  {item.description}
                </p>

                {/* Interactive Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: range.color, marginBottom: '6px' }}>
                    <span>Scale Range</span>
                    <span>{range.label}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={score}
                    onChange={(e) => handleScoreChange(item.id, e.target.value)}
                    style={{
                      width: '100%',
                      accentColor: range.color,
                      cursor: 'pointer',
                      height: '6px'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar: Radar Graph & Insight */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Radar Graph */}
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', marginBottom: '4px' }}>
              Wealth Wheel Harmony
            </h3>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>8-Axis Holistic Balance</span>

            <div style={{ width: '100%', height: 290, marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#CBD5E1" fontSize={9} />
                  <Radar name="Wealth Level" dataKey="Score" stroke="#6558D3" fill="#6558D3" fillOpacity={0.45} />
                  <Tooltip formatter={(val) => [`${val}/100`, 'Score']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vedic Wisdom Card */}
          <div className="card" style={{ backgroundColor: '#0F172A', color: 'white', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: '#FBBF24' }}>
              <Zap size={20} />
              <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Vedic Perspective</h4>
            </div>
            <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: '1.6', margin: 0 }}>
              In ancient Vedic tradition, true wealth (<em>Lakshmi</em>) encompasses 8 interdependent aspects of well-being. True prosperity is achieved when material abundance is aligned with spiritual peace, health, knowledge, and courage.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
