import { useState } from 'react';

interface TabItem {
  key: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  defaultKey?: string;
  activeKey?: string;
  onChange?: (key: string) => void;
}

export default function Tabs({ items, defaultKey, activeKey, onChange }: TabsProps) {
  const [internalKey, setInternalKey] = useState(defaultKey || items[0]?.key || '');
  const currentKey = activeKey !== undefined ? activeKey : internalKey;

  const handleClick = (key: string) => {
    if (activeKey === undefined) {
      setInternalKey(key);
    }
    onChange?.(key);
  };

  return (
    <div className="border-b border-neutral-200">
      <div className="flex gap-1 -mb-px">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => handleClick(item.key)}
            className={`tab-item ${currentKey === item.key ? 'tab-active' : 'tab-inactive'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
