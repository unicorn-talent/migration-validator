// package: 
// file: nft.proto

import * as jspb from "google-protobuf";

export class NftPacked extends jspb.Message {
  getChainNonce(): number;
  setChainNonce(value: number): void;

  getData(): Uint8Array | string;
  getData_asU8(): Uint8Array;
  getData_asB64(): string;
  setData(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): NftPacked.AsObject;
  static toObject(includeInstance: boolean, msg: NftPacked): NftPacked.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: NftPacked, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): NftPacked;
  static deserializeBinaryFromReader(message: NftPacked, reader: jspb.BinaryReader): NftPacked;
}

export namespace NftPacked {
  export type AsObject = {
    chainNonce: number,
    data: Uint8Array | string,
  }
}

export class NftEthNative extends jspb.Message {
  getNftKind(): NftEthNative.NftKindMap[keyof NftEthNative.NftKindMap];
  setNftKind(value: NftEthNative.NftKindMap[keyof NftEthNative.NftKindMap]): void;

  getId(): string;
  setId(value: string): void;

  getContractAddr(): string;
  setContractAddr(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): NftEthNative.AsObject;
  static toObject(includeInstance: boolean, msg: NftEthNative): NftEthNative.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: NftEthNative, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): NftEthNative;
  static deserializeBinaryFromReader(message: NftEthNative, reader: jspb.BinaryReader): NftEthNative;
}

export namespace NftEthNative {
  export type AsObject = {
    nftKind: NftEthNative.NftKindMap[keyof NftEthNative.NftKindMap],
    id: string,
    contractAddr: string,
  }

  export interface NftKindMap {
    ERC721: 0;
    ERC1155: 1;
  }

  export const NftKind: NftKindMap;
}

