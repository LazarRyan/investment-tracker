export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let resolves: Array<(value: ReturnType<T>) => void> = [];
  let rejects: Array<(reason?: any) => void> = [];
  
  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    lastArgs = args;

    if (timeout) {
      clearTimeout(timeout);
    }

    const promise = new Promise<ReturnType<T>>((resolve, reject) => {
      resolves.push(resolve);
      rejects.push(reject);
    });

    timeout = setTimeout(async () => {
      const currentArgs = lastArgs as Parameters<T>;
      const currentResolves = resolves;
      const currentRejects = rejects;

      resolves = [];
      rejects = [];
      timeout = null;

      try {
        const result = await func(...currentArgs);
        currentResolves.forEach(r => r(result as ReturnType<T>));
      } catch (error) {
        currentRejects.forEach(r => r(error));
      }
    }, wait);

    return promise;
  };
} 