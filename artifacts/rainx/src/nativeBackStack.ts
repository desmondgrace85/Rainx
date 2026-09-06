type NativeBackHandler = () => boolean | void;

const handlers: NativeBackHandler[] = [];

export function registerNativeBackHandler(handler: NativeBackHandler) {
  handlers.push(handler);
  return () => {
    const index = handlers.lastIndexOf(handler);
    if (index >= 0) handlers.splice(index, 1);
  };
}

export function consumeNativeBack() {
  for (let index = handlers.length - 1; index >= 0; index -= 1) {
    try {
      if (handlers[index]?.()) return true;
    } catch {}
  }
  return false;
}
