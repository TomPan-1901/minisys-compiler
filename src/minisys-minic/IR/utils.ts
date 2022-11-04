// yacc文件中主要部分

import { IRArray } from "./IRArray";
import { IRFunction } from "./IRFunction";
import { IRVarialble } from "./IRVariable";

let variables: (IRVarialble | IRArray)[] = []
let functions: IRFunction[] = []