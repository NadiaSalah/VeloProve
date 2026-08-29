
import React from 'react';
import { invoke } from '@tauri-apps/api/core';

export function FileRecoveryUI() {
  const handleRecover = () => {
    invoke('recover_files', { extensions: ['jpg', 'png'] });
  };

  const handleExport = () => {
    console.log('TODO: implement export'); // No-op placeholder
  };

  return (
    <div>
      <select name="extensions">
        <option value="jpg">JPEG Image</option>
        <option value="png">PNG Image</option>
        <option value="pdf">PDF Document</option>
      </select>

      <button onClick={handleRecover}>Start Recovery</button>
      <button onClick={handleExport}>Export Results</button>
    </div>
  );
}
