import React from 'react';
import { NAV_ITEMS } from './Sidebar';

export function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
