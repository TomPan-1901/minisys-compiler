export default class ASTNode {
	label: string
	child: ASTNode[]
	attributes?: any

	constructor(label: string, attributes?: any, child?: ASTNode[]) {
		this.label = label
		this.child = child ? child : []
		this.attributes = attributes ? attributes : undefined
	}

	public static fromTerminator(terminator: string, attributes?: any): ASTNode {
		return new ASTNode(terminator, attributes)
	}

	public static fromNonTerminator(nonTerminator: string, child: ASTNode[], attributes?: any) {
		return new ASTNode(nonTerminator, attributes, child)
	}
}