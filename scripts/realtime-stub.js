// Impact Accelerator does not use realtime channels; this stub replaces the websocket library in source builds.
export class Socket { constructor() {} connect() {} disconnect() {} channel() { return { join() { return this; }, on() { return this; }, receive() { return this; }, leave() {}, push() { return this; } }; } onOpen() {} onClose() {} onError() {} onMessage() {} isConnected() { return false; } setAuth() {} }
export class Channel {}
export class Presence {}
export class IcebergRestCatalog {}
export default {};
