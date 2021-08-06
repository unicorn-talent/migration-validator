import { Server as HttpServer } from "http";

import { Server, ServerOptions } from "socket.io";
import { ServerEvents } from "./events";

export type TxnSocketServe = Server<ServerEvents>

export function txEventSocket(http_server: HttpServer, options: Partial<ServerOptions> | undefined = undefined): TxnSocketServe {
    return new Server(http_server, options);
}