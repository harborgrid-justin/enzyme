/**
 * Generic priority queue using a binary heap.
 *
 * @description
 * Implements a min-heap based priority queue for efficient O(log n)
 * insertion and extraction of highest priority items.
 *
 * @template T - Type of items in the queue
 */
export class PriorityQueue<T extends { priority: number }> {
  private heap: T[] = [];

  /**
   * Returns the number of items in the queue.
   */
  get size(): number {
    return this.heap.length;
  }

  /**
   * Returns whether the queue is empty.
   */
  get isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Inserts an item into the queue.
   * @param item - Item to insert
   */
  enqueue(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Removes and returns the highest priority item.
   * @returns The highest priority item or undefined if queue is empty
   */
  dequeue(): T | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const result = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);

    return result;
  }

  /**
   * Returns the highest priority item without removing it.
   * @returns The highest priority item or undefined if queue is empty
   */
  peek(): T | undefined {
    return this.heap[0];
  }

  /**
   * Removes all items from the queue.
   */
  clear(): void {
    this.heap = [];
  }

  /**
   * Removes a specific item from the queue.
   * @param predicate - Function to identify the item to remove
   * @returns Whether an item was removed
   */
  remove(predicate: (item: T) => boolean): boolean {
    const index = this.heap.findIndex(predicate);
    if (index === -1) return false;

    if (index === this.heap.length - 1) {
      this.heap.pop();
      return true;
    }

    const lastItem = this.heap.pop();
    if (lastItem === undefined) return true;

    this.heap[index] = lastItem;
    const parentIndex = Math.floor((index - 1) / 2);

    if (index > 0 && this.heap[index]!.priority < this.heap[parentIndex]!.priority) {
      this.bubbleUp(index);
    } else {
      this.bubbleDown(index);
    }

    return true;
  }

  /**
   * Returns all items in the queue (not in priority order).
   */
  toArray(): T[] {
    return [...this.heap];
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const currentItem = this.heap[index];
      const parentItem = this.heap[parentIndex];
      if (!currentItem || !parentItem || currentItem.priority >= parentItem.priority) break;

      [this.heap[index], this.heap[parentIndex]] = [parentItem, currentItem];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const lastIndex = this.heap.length - 1;

    while (true) {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;
      let smallestIndex = index;

      const leftChild = this.heap[leftChildIndex];
      const rightChild = this.heap[rightChildIndex];
      const smallestItem = this.heap[smallestIndex];

      if (
        leftChildIndex <= lastIndex &&
        leftChild &&
        smallestItem &&
        leftChild.priority < smallestItem.priority
      ) {
        smallestIndex = leftChildIndex;
      }

      const updatedSmallestItem = this.heap[smallestIndex];
      if (
        rightChildIndex <= lastIndex &&
        rightChild &&
        updatedSmallestItem &&
        rightChild.priority < updatedSmallestItem.priority
      ) {
        smallestIndex = rightChildIndex;
      }

      if (smallestIndex === index) break;

      const indexItem = this.heap[index];
      const smallestIndexItem = this.heap[smallestIndex];
      if (!indexItem || !smallestIndexItem) break;

      [this.heap[index], this.heap[smallestIndex]] = [smallestIndexItem, indexItem];
      index = smallestIndex;
    }
  }
}
