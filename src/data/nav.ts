export interface NavItem { name: string; path: string }

export interface NavGroup { label: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    label: '档案',
    items: [
      { name: '国家', path: '/nations' },
      { name: '人物', path: '/people' },
      { name: '战争', path: '/wars' },
      { name: '建筑', path: '/buildings' },
      { name: '事件', path: '/events' },
      { name: '编年史', path: '/chronicle' },
    ],
  },
  {
    label: '图鉴',
    items: [
      { name: '分级目录', path: '/series' },
      { name: '版式主题', path: '/themes' },
      { name: '排行榜', path: '/rankings' },
    ],
  },
  {
    label: '更多',
    items: [
      { name: '写作指导', path: '/guide' },
      { name: '聊天室', path: '/chat' },
      { name: '关于', path: '/about' },
    ],
  },
];
