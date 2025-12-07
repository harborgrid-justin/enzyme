/**
 * @file Action Timeline
 * @description Visual timeline of dispatched actions
 */

import type { ActionRecord } from '../action-recorder';

// ============================================================================
// Types
// ============================================================================

export interface TimelineItem {
  id: string;
  action: ActionRecord;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface TimelineGroup {
  id: string;
  name: string;
  items: TimelineItem[];
  y: number;
  height: number;
  collapsed: boolean;
}

export interface TimelineOptions {
  /** Width of timeline */
  width?: number;
  /** Height of timeline */
  height?: number;
  /** Item height */
  itemHeight?: number;
  /** Group height */
  groupHeight?: number;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Color map for action types */
  colorMap?: Record<string, string>;
}

export interface TimeRange {
  start: number;
  end: number;
}

// ============================================================================
// Action Timeline
// ============================================================================

export class ActionTimeline {
  private options: Required<TimelineOptions>;
  private actions: ActionRecord[] = [];
  private groups = new Map<string, TimelineGroup>();
  private items: TimelineItem[] = [];
  private zoom = 1;
  private pan = 0;
  private selectedItem: TimelineItem | null = null;
  private timeRange: TimeRange | null = null;

  constructor(options: TimelineOptions = {}) {
    this.options = {
      width: options.width ?? 1000,
      height: options.height ?? 600,
      itemHeight: options.itemHeight ?? 24,
      groupHeight: options.groupHeight ?? 32,
      minZoom: options.minZoom ?? 0.1,
      maxZoom: options.maxZoom ?? 10,
      colorMap: options.colorMap ?? this.getDefaultColorMap(),
    };
  }

  /**
   * Set actions to display
   */
  setActions(actions: ActionRecord[]): void {
    this.actions = [...actions].sort((a, b) => a.timestamp - b.timestamp);
    this.rebuild();
  }

  /**
   * Add action
   */
  addAction(action: ActionRecord): void {
    this.actions.push(action);
    this.actions.sort((a, b) => a.timestamp - b.timestamp);
    this.rebuild();
  }

  /**
   * Clear actions
   */
  clear(): void {
    this.actions = [];
    this.groups.clear();
    this.items = [];
    this.selectedItem = null;
    this.timeRange = null;
  }

  /**
   * Set time range
   */
  setTimeRange(start: number, end: number): void {
    this.timeRange = { start, end };
    this.rebuild();
  }

  /**
   * Clear time range
   */
  clearTimeRange(): void {
    this.timeRange = null;
    this.rebuild();
  }

  /**
   * Set zoom level
   */
  setZoom(zoom: number): void {
    this.zoom = Math.max(this.options.minZoom, Math.min(this.options.maxZoom, zoom));
    this.rebuild();
  }

  /**
   * Zoom in
   */
  zoomIn(factor = 1.2): void {
    this.setZoom(this.zoom * factor);
  }

  /**
   * Zoom out
   */
  zoomOut(factor = 1.2): void {
    this.setZoom(this.zoom / factor);
  }

  /**
   * Set pan offset
   */
  setPan(offset: number): void {
    this.pan = offset;
  }

  /**
   * Select item
   */
  selectItem(itemId: string): void {
    this.selectedItem = this.items.find((item) => item.id === itemId) ?? null;
  }

  /**
   * Deselect item
   */
  deselectItem(): void {
    this.selectedItem = null;
  }

  /**
   * Get item at position
   */
  getItemAtPosition(x: number, y: number): TimelineItem | null {
    for (const item of this.items) {
      if (
        x >= item.x &&
        x <= item.x + item.width &&
        y >= item.y &&
        y <= item.y + item.height
      ) {
        return item;
      }
    }
    return null;
  }

  /**
   * Get all groups
   */
  getGroups(): TimelineGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Get all items
   */
  getItems(): TimelineItem[] {
    return [...this.items];
  }

  /**
   * Get selected item
   */
  getSelectedItem(): TimelineItem | null {
    return this.selectedItem;
  }

  /**
   * Collapse group
   */
  collapseGroup(groupId: string): void {
    const group = this.groups.get(groupId);
    if (group) {
      group.collapsed = true;
      this.rebuild();
    }
  }

  /**
   * Expand group
   */
  expandGroup(groupId: string): void {
    const group = this.groups.get(groupId);
    if (group) {
      group.collapsed = false;
      this.rebuild();
    }
  }

  /**
   * Toggle group
   */
  toggleGroup(groupId: string): void {
    const group = this.groups.get(groupId);
    if (group) {
      group.collapsed = !group.collapsed;
      this.rebuild();
    }
  }

  /**
   * Filter actions by type
   */
  filterByType(types: string[]): void {
    this.actions = this.actions.filter((action) => types.includes(action.type));
    this.rebuild();
  }

  /**
   * Filter actions by store
   */
  filterByStore(stores: string[]): void {
    this.actions = this.actions.filter(
      (action) => action.store && stores.includes(action.store)
    );
    this.rebuild();
  }

  /**
   * Rebuild timeline
   */
  private rebuild(): void {
    this.groups.clear();
    this.items = [];

    if (this.actions.length === 0) {
      return;
    }

    // Filter by time range
    let filteredActions = this.actions;
    if (this.timeRange) {
      filteredActions = this.actions.filter(
        (action) =>
          action.timestamp >= this.timeRange!.start &&
          action.timestamp <= this.timeRange!.end
      );
    }

    if (filteredActions.length === 0) {
      return;
    }

    // Calculate time bounds
    const minTime = filteredActions[0].timestamp;
    const maxTime = filteredActions[filteredActions.length - 1].timestamp;
    const timeSpan = maxTime - minTime || 1;

    // Group by store
    const actionsByStore = new Map<string, ActionRecord[]>();
    for (const action of filteredActions) {
      const store = action.store ?? 'default';
      if (!actionsByStore.has(store)) {
        actionsByStore.set(store, []);
      }
      actionsByStore.get(store)!.push(action);
    }

    // Create groups and items
    let currentY = 0;

    for (const [storeName, storeActions] of actionsByStore) {
      const groupId = `group_${storeName}`;
      const group: TimelineGroup = {
        id: groupId,
        name: storeName,
        items: [],
        y: currentY,
        height: this.options.groupHeight,
        collapsed: false,
      };

      currentY += this.options.groupHeight;

      // Create items for this group
      for (const action of storeActions) {
        const normalizedTime = (action.timestamp - minTime) / timeSpan;
        const x = normalizedTime * this.options.width * this.zoom + this.pan;
        const width = Math.max(2, (action.duration ?? 1) * this.zoom);

        const item: TimelineItem = {
          id: action.id,
          action,
          x,
          y: currentY,
          width,
          height: this.options.itemHeight,
          color: this.getActionColor(action.type),
        };

        group.items.push(item);
        this.items.push(item);
      }

      currentY += this.options.itemHeight + 4; // 4px spacing

      this.groups.set(groupId, group);
    }
  }

  /**
   * Get action color
   */
  private getActionColor(type: string): string {
    // Check color map
    for (const [pattern, color] of Object.entries(this.options.colorMap)) {
      if (type.includes(pattern)) {
        return color;
      }
    }

    // Default color based on hash
    const hash = this.hashString(type);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
  }

  /**
   * Hash string to number
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Get default color map
   */
  private getDefaultColorMap(): Record<string, string> {
    return {
      'increment': '#4CAF50',
      'decrement': '#F44336',
      'set': '#2196F3',
      'reset': '#FF9800',
      'fetch': '#9C27B0',
      'update': '#00BCD4',
      'delete': '#F44336',
      'create': '#4CAF50',
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format action details for tooltip
 */
export function formatActionDetails(action: ActionRecord): string {
  const lines: string[] = [];

  lines.push(`Type: ${action.type}`);

  if (action.store) {
    lines.push(`Store: ${action.store}`);
  }

  if (action.source) {
    lines.push(`Source: ${action.source}`);
  }

  const date = new Date(action.timestamp);
  lines.push(`Time: ${date.toLocaleTimeString()}`);

  if (action.duration !== undefined) {
    lines.push(`Duration: ${action.duration.toFixed(2)}ms`);
  }

  if (action.payload) {
    lines.push(`Payload: ${JSON.stringify(action.payload, null, 2)}`);
  }

  return lines.join('\n');
}

/**
 * Export timeline as SVG
 */
export function exportTimelineAsSVG(timeline: ActionTimeline, width: number, height: number): string {
  const items = timeline.getItems();
  const groups = timeline.getGroups();

  const svg: string[] = [];
  svg.push(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`);

  // Draw groups
  for (const group of groups) {
    svg.push(`<rect x="0" y="${group.y}" width="${width}" height="${group.height}" fill="#f0f0f0" />`);
    svg.push(`<text x="10" y="${group.y + group.height / 2}" dominant-baseline="middle" fill="#333">${group.name}</text>`);
  }

  // Draw items
  for (const item of items) {
    svg.push(
      `<rect x="${item.x}" y="${item.y}" width="${item.width}" height="${item.height}" ` +
      `fill="${item.color}" title="${item.action.type}" />`
    );
  }

  svg.push('</svg>');

  return svg.join('\n');
}
