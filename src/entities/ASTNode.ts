export default class ASTNode {
	label: string
	child: ASTNode[]
	constructor(label: string, child: ASTNode[] = []) {
		this.label = label
		this.child = child
	}
}