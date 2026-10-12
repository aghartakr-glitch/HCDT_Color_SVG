import JSZip from 'jszip';
import { FORMAT_KEYS } from '../data';
import { buildLogoSvg, fileName, zipName } from './svg';
import type { Colorway, FormatKey, VariantId } from '../types';

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function svgFileContent(cw: Colorway, format: FormatKey, variant: VariantId, includeBackground: boolean) {
  const body = buildLogoSvg(cw, format, variant, { includeBackground });
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`;
}

export function downloadSvg(cw: Colorway, format: FormatKey, variant: VariantId, includeBackground: boolean) {
  const blob = new Blob([svgFileContent(cw, format, variant, includeBackground)], { type: 'image/svg+xml;charset=utf-8' });
  saveBlob(blob, fileName(cw, format, variant, includeBackground));
}

/** 현재 컬러·적용 방식의 The Longest / Long / Short 3개를 ZIP 한 개로 */
export async function buildZip(cw: Colorway, variant: VariantId, includeBackground: boolean): Promise<Blob> {
  const zip = new JSZip();
  for (const f of FORMAT_KEYS) {
    zip.file(fileName(cw, f, variant, includeBackground), svgFileContent(cw, f, variant, includeBackground));
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export async function downloadZip(cw: Colorway, variant: VariantId, includeBackground: boolean) {
  saveBlob(await buildZip(cw, variant, includeBackground), zipName(cw, variant));
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
