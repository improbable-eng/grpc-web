import { sayHi } from './example/greeter.js'
import testProto from './code_gen/test.js'

const container = document.getElementById("container");


console.dir(testProto)


container.innerText = sayHi("Michal!")