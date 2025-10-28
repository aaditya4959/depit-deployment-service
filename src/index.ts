import { pollQueue } from "./utils/queuePuller.js"
import { projectBuilder } from "./utils/projectBuilder.js";


async function main () {
    while(true) {
        await pollQueue();
    }
}
main();