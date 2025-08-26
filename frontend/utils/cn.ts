/**
 * 类名合并工具函数
 * 简单的 CSS 类名合并工具，类似于 clsx 或 classnames
 */

type ClassValue = string | number | boolean | undefined | null | ClassValue[] | Record<string, any>;

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  inputs.forEach((input) => {
    if (!input) return;

    if (typeof input === 'string') {
      classes.push(input);
    } else if (typeof input === 'number') {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const result = cn(...input);
      if (result) classes.push(result);
    } else if (typeof input === 'object') {
      Object.entries(input).forEach(([key, value]) => {
        if (value) classes.push(key);
      });
    }
  });

  return classes.join(' ');
}

export default cn;