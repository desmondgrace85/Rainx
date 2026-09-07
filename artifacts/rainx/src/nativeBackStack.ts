type NativeBackHandler = () => boolean | void;
type NativeBackEntry = {
  handler: NativeBackHandler;
  label: string;
};

const handlers: NativeBackEntry[] = [];

export function registerNativeBackHandler(handler: NativeBackHandler, label = "anonymous") {
  const entry = { handler, label };
  handlers.push(entry);
  return () => {
    const index = handlers.lastIndexOf(entry);
    if (index >= 0) handlers.splice(index, 1);
  };
}

export function consumeNativeBack() {
  for (let index = handlers.length - 1; index >= 0; index -= 1) {
    try {
      if (handlers[index]?.handler()) {
        console.info("[RainX][native-back] registry handler", handlers[index].label);
        return true;
      }
    } catch (error) {
      console.error("[RainX][native-back] registry handler failed", handlers[index].label, error);
    }
  }
  return false;
}
