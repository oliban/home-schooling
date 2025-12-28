import { spawn } from 'child_process';
import path from 'path';

export interface ScriptResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
}

/**
 * Executes a bash script as a child process and captures its output.
 * Returns a promise that resolves when the script completes or times out.
 *
 * @param scriptName - Name of the script file (backup-prod.sh or restore-local.sh)
 * @param onOutput - Callback called for each chunk of output data
 * @returns Promise resolving to script execution result
 */
export function runScript(
  scriptName: 'backup-prod.sh' | 'restore-local.sh',
  onOutput: (data: string) => void
): Promise<ScriptResult> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), '..', 'scripts', scriptName);
    const projectRoot = path.join(process.cwd(), '..');
    const child = spawn('bash', [scriptPath], {
      cwd: projectRoot,
      env: process.env,
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      onOutput(text);
    });

    child.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      errorOutput += text;
      onOutput(text);
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        output: output + errorOutput,
        error: code !== 0 ? `Script exited with code ${code}` : undefined,
        exitCode: code || 0,
      });
    });

    child.on('error', (err) => {
      resolve({
        success: false,
        output: output + errorOutput,
        error: err.message,
        exitCode: -1,
      });
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      child.kill();
      resolve({
        success: false,
        output: output + errorOutput,
        error: 'Script timeout (5 minutes)',
        exitCode: -1,
      });
    }, 5 * 60 * 1000);
  });
}
