/**
 * dsh-discovery host entry: mounts a read-only registry route that lists
 * community DSH plugins from the GitHub `dsh-plugin` topic. Deliberately no
 * install / update / restart endpoints — installation is left to the user or
 * the host agent after reviewing a repository (dsh plugin add).
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-discovery";
export declare function apply(ctx: Context): void;
