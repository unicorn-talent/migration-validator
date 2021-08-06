"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.txEventSocket = void 0;
const socket_io_1 = require("socket.io");
function txEventSocket(http_server, options = undefined) {
    return new socket_io_1.Server(http_server, options);
}
exports.txEventSocket = txEventSocket;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvc29ja2V0L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLHlDQUFrRDtBQUtsRCxTQUFnQixhQUFhLENBQUMsV0FBdUIsRUFBRSxVQUE4QyxTQUFTO0lBQzFHLE9BQU8sSUFBSSxrQkFBTSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM1QyxDQUFDO0FBRkQsc0NBRUMifQ==