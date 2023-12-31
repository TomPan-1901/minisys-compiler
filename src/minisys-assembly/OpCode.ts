export const GeneralHigh6OpCode: Map<string, number> = new Map([
  ['add', '000000'],
  ['addu', '000000'],
  ['sub', '000000'],
  ['subu', '000000'],
  ['and', '000000'],
  ['mult', '000000'],
  ['multu', '000000'],
  ['div', '000000'],
  ['divu', '000000'],
  ['nop', '000000'],
  ['mfhi', '000000'],
  ['mflo', '000000'],
  ['mthi', '000000'],
  ['mtlo', '000000'],
  ['mfc0', '000000'],
  ['mtc0', '000000'],
  ['or', '000000'],
  ['xor', '000000'],
  ['nor', '000000'],
  ['slt', '000000'],
  ['sltu', '000000'],
  ['sll', '000000'],
  ['srl', '000000'],
  ['sra', '000000'],
  ['sllv', '000000'],
  ['srlv', '000000'],
  ['srav', '000000'],
  ['jr', '000000'],
  ['jalr', '000000'],
  ['break', '000000'],
  ['syscall', '000000'],
  ['eret', '000000'],
  ['addi', '001000'],
  ['addiu', '001001'],
  ['andi', '001100'],
  ['ori', '001101'],
  ['xori', '001110'],
  ['lui', '001111'],
  ['lb', '100000'],
  ['lbu', '100100'],
  ['lh', '100001'],
  ['lhu', '100101'],
  ['sb', '101000'],
  ['sh', '101001'],
  ['lw', '100011'],
  ['sw', '101011'],
  ['beq', '000100'],
  ['bne', '000101'],
  ['bgez', '000001'],
  ['bgtz', '000111'],
  ['blez', '000110'],
  ['bltz', '000001'],
  ['bgezal', '000001'],
  ['bltzal', '000001'],
  ['slti', '001010'],
  ['sltiu', '001011'],
  ['j', '000010'],
  ['jal', '000011']
].map(([com, opcode]) => [com, parseInt(opcode, 2)]))

export const RLow6OpCode: Map<string, number> = new Map([
  ['add', '100000'],
  ['addu', '100001'],
  ['sub', '100010'],
  ['subu', '100011'],
  ['and', '100100'],
  ['mult', '011000'],
  ['multu', '011001'],
  ['div', '011010'],
  ['divu', '011011'],
  ['mfhi', '010000'],
  ['mflo', '010010'],
  ['mthi', '010001'],
  ['mtlo', '010011'],
  ['mfc0', ''],
  ['mtc0', ''],
  ['nop', '000000'],
  ['or', '100101'],
  ['xor', '100110'],
  ['nor', '100111'],
  ['slt', '101010'],
  ['sltu', '101011'],
  ['sll', '000000'],
  ['srl', '000010'],
  ['sra', '000011'],
  ['sllv', '000100'],
  ['srlv', '000110'],
  ['srav', '000111'],
  ['jr', '001000'],
  ['jalr', '001001'],
  ['break', '001101'],
  ['syscall', '001100'],
  ['eret', '011000'],
].map(([com, opcode]) => [com, parseInt(opcode, 2)]))