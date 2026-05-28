/**
 * Cross-platform `az` runner.
 *
 * Why this file exists: the example runs on the user's Windows box (PowerShell
 * 7 + Azure CLI installed, `az login` done) but also needs to boot cleanly on
 * Linux/macOS dev machines without crashing the Vite plugin. Spawning `az`
 * directly is non-trivial on Windows because the actual binary is `az.cmd` —
 * a batch file — which Node's `child_process.spawn` won't resolve unless you
 * either give it the full path or go through `cmd.exe /c`.
 *
 * Strategy:
 *   - Windows: `cmd.exe /c az <args>` — `cmd` resolves az from PATH safely.
 *   - POSIX:   `az <args>` directly.
 *   - In both cases args are passed as an array, NEVER concatenated into a
 *     shell string — so user-supplied values can't break out into shell.
 *
 * Output: we always pass `--output json` to az so the parsed result is a
 * predictable shape. Errors come back on stderr; we surface them with the
 * exit code intact for the caller to translate to an HTTP status.
 */
import { spawn } from 'node:child_process';
import { platform } from 'node:process';

const IS_WIN = platform === 'win32';

/**
 * Run an `az` command and resolve with the parsed JSON output.
 * Throws an Error with `.code` (exit code) and `.stderr` populated on failure.
 */
export function runAz(args, { signal } = {}) {
  return new Promise((resolve, reject) => {
    const stdout = [];
    const stderr = [];
    const child = spawnAzProcess(args, { signal });
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) {
        const out = Buffer.concat(stdout).toString('utf-8').trim();
        if (out === '') return resolve(null);
        try {
          resolve(JSON.parse(out));
        } catch (e) {
          // Some `az` outputs aren't JSON (e.g. `az --version`). Return raw.
          resolve(out);
        }
      } else {
        const err = new Error(
          `az ${args.join(' ')} exited with code ${code}: ${Buffer.concat(stderr).toString('utf-8').trim()}`
        );
        err.code = code;
        err.stderr = Buffer.concat(stderr).toString('utf-8');
        reject(err);
      }
    });
  });
}

/**
 * Run `az` and stream stdout line-by-line via a callback. Used by the
 * deployment wizard so the UI can show progress as it happens.
 *
 * `onLine(line, stream)` is called for each newline-terminated chunk on
 * either stream ('stdout' | 'stderr'). The returned promise resolves to the
 * exit code.
 */
export function streamAz(args, { signal, onLine }) {
  return new Promise((resolve, reject) => {
    const child = spawnAzProcess(args, { signal });

    /** @param {NodeJS.ReadableStream} stream @param {'stdout'|'stderr'} name */
    function pipeLines(stream, name) {
      let buf = '';
      stream.setEncoding('utf-8');
      stream.on('data', (chunk) => {
        buf += chunk;
        let nl;
        while ((nl = buf.indexOf('\n')) !== -1) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          onLine(line, name);
        }
      });
      stream.on('end', () => {
        if (buf.length > 0) onLine(buf, name);
      });
    }

    pipeLines(child.stdout, 'stdout');
    pipeLines(child.stderr, 'stderr');

    child.on('error', (err) => reject(err));
    child.on('close', (code) => resolve(code ?? -1));
  });
}

function spawnAzProcess(args, { signal } = {}) {
  // CRITICAL: pass args as an array, not as a single shell string. The
  // values may originate from user input (resource group names, etc.) and
  // we trust az's own validation but not shell-parsing the strings.
  if (IS_WIN) {
    return spawn('cmd.exe', ['/c', 'az', ...args], {
      windowsHide: true,
      signal,
    });
  }
  return spawn('az', args, { signal });
}

/**
 * Quick probe — verify `az` is on PATH and reachable. Used by the /status
 * endpoint to render the "prerequisites missing" banner if it isn't.
 */
export async function probeAz() {
  try {
    const version = await runAz(['version', '--output', 'json']);
    return {
      installed: true,
      cliVersion: version?.['azure-cli'] ?? 'unknown',
      extensions: Object.keys(version?.extensions ?? {}),
    };
  } catch (err) {
    return { installed: false, error: err.message };
  }
}

/**
 * Run a small PowerShell snippet on Windows. Returns stdout as a trimmed
 * string. We use this for things `az` doesn't expose (e.g. `Get-AzContext`
 * if the user is running the Az module instead of CLI). Kept narrow so we
 * never need to interpolate into the script.
 */
export function runPwsh(script, { signal } = {}) {
  if (!IS_WIN) {
    return Promise.reject(new Error('PowerShell helper is Windows-only.'));
  }
  return new Promise((resolve, reject) => {
    const stdout = [];
    const stderr = [];
    const child = spawn(
      'pwsh.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, signal }
    );
    child.stdout.on('data', (c) => stdout.push(c));
    child.stderr.on('data', (c) => stderr.push(c));
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout).toString('utf-8').trim());
      } else {
        reject(
          new Error(
            `pwsh exited with code ${code}: ${Buffer.concat(stderr).toString('utf-8').trim()}`
          )
        );
      }
    });
  });
}

export const platformInfo = {
  isWindows: IS_WIN,
  platform,
};
