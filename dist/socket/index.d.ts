/// <reference types="node" />
import { Server as HttpServer } from "http";
import { Server, ServerOptions } from "socket.io";
import { ServerEvents } from "./events";
export declare type TxnSocketServe = Server<ServerEvents>;
export declare function txEventSocket(http_server: HttpServer, options?: Partial<ServerOptions> | undefined): TxnSocketServe;
