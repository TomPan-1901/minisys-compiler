export class Production {
  private left: string
  private right: string[]
  private priority?: number
  private priorityTerminator?: string

  constructor(left: string, right: string[], priorityMap?: Map<string, number>) {
    this.left = left
    this.right = right
    if (priorityMap === undefined) {
      return
    }
    for (let i = right.length - 1; i >= 0; i--) {
      if ((priorityMap as Map<string, number>).has(right[i])) {
        this.priority = (priorityMap as Map<string, number>).get(right[i])
        this.priorityTerminator = right[i]
        break
      }
    }
  }

  public getLeft(): string {
    return this.left
  }

  public getRight(): string[] {
    return this.right
  }

  public setLeft(left: string): void {
    this.left = left
  }

  public setRight(right: string[]): void {
    this.right = right
  }

  public equals(another: Production): boolean {
    return (
      this.left === another.left &&
      this.right.length === another.right.length &&
      this.right.every((value, index) => another.right[index] === value)
    )
  }

  public setPriority(priority?: number) {
    this.priority = priority
  }

  public getPriority(): number | undefined {
    return this.priority
  }

  public getPriorityTerminator() {
    return this.priorityTerminator
  }

  public deepCopy(): Production {
    let ans = new Production(this.left, this.right.map(item => item))
    ans.setPriority(this.priority)
    return ans
  }
}