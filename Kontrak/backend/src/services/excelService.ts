import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import XLSX from 'xlsx';
import { getPool } from '../config/database';
import { authConfig, quoteIdentifier } from '../config/auth';
import { create } from './contractService';

type ImportRow = { nip: string; employeeName?: string; department?: string; startDate: string; endDate: string; contractNumber?: string };

const text = (value: unknown) => String(value ?? '').trim();
const normalize = (value: unknown) => text(value).toLowerCase().replace(/[\s_/-]+/g, '');
const dateLike = (value: unknown) => Boolean(date(value));
const isContractNumber = (value: unknown) => /^(?:\d{1,4}|\d{1,4}\/[^/]+\/[^/]+\/[IVXLCDM]+\/\d{4})$/i.test(text(value));
const romanMonths = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const contractNumber = (value: unknown, startDate: string) => {
  const raw = text(value);
  if (!raw || raw === '-') return undefined;
  if (/^\d{1,3}\/[^/]+\/[^/]+\/[IVXLCDM]+\/\d{4}$/i.test(raw)) return raw;
  if (!/^\d{1,4}$/.test(raw) || !startDate) return dateLike(raw) ? undefined : raw;
  const month = Number(startDate.slice(5, 7));
  const year = startDate.slice(0, 4);
  return `${raw}/HC/BMC/${romanMonths[month]}/${year}`;
};
const date = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const valueText = text(value);
  if (/^\d+(\.\d+)?$/.test(valueText)) {
    const serial = Number(valueText);
    if (serial > 20000 && serial < 80000) {
      const excelDate = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      return excelDate.toISOString().slice(0, 10);
    }
  }
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[ T].*)?$/.test(valueText)) { const [y, m, d] = valueText.split(/[-/ T]/); return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; }
  const match = valueText.match(/^(\d{1,2})[-/. ]([A-Za-z]+|\d{1,2})[-/. ](\d{2,4})$/);
  if (!match) return '';
  const months: Record<string, number> = { jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, mar: 3, maret: 3, march: 3, apr: 4, april: 4, may: 5, mei: 5, jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7, aug: 8, agustus: 8, august: 8, sep: 9, september: 9, oct: 10, oktober: 10, october: 10, nov: 11, november: 11, dec: 12, desember: 12, december: 12 };
  const month = Number.isNaN(Number(match[2])) ? months[match[2].toLowerCase()] : Number(match[2]);
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return month ? `${year}-${String(month).padStart(2, '0')}-${match[1].padStart(2, '0')}` : '';
};

export async function importWorkbook(buffer: Buffer, by: string) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false });
  if (!rows.length) throw Object.assign(new Error('File Excel kosong.'), { status: 400 });
  const headerNames = ['nip', 'nama', 'namakaryawan', 'departemen', 'nomorkontrak', 'tanggalawal', 'awalkontrak', 'awalcontrak', 'awalcontract', 'tanggalakhir', 'akhirkontrak'];
  const headerRow = rows.slice(0, 10).findIndex(row => (row as unknown[]).map(normalize).filter(value => headerNames.includes(value)).length >= 2);
  const hasHeader = headerRow >= 0;
  // Without a header, use A-E for the required fields and F for an optional contract number.
  const firstDataRow = rows[(hasHeader ? headerRow + 1 : 0)] as unknown[] | undefined;
  const numberBeforeDates = !hasHeader && !date(firstDataRow?.[3]) && Boolean(date(firstDataRow?.[4])) && Boolean(date(firstDataRow?.[5]));
  const header = hasHeader ? (rows[headerRow] as unknown[]).map(normalize) : numberBeforeDates ? ['nip', 'nama', 'departemen', 'contractnumber', 'startdate', 'enddate'] : ['nip', 'nama', 'departemen', 'startdate', 'enddate', 'contractnumber'];
  const index = (names: string[], fallback: number) => { const found = names.map(normalize).map(name => header.indexOf(name)).find(value => value >= 0); return found ?? fallback; };
  const nipIndex = hasHeader ? index(['nip', 'nik'], 0) : 0;
  const nameIndex = hasHeader ? index(['nama', 'namakaryawan', 'name'], 1) : 1;
  const departmentIndex = hasHeader ? index(['departemen', 'department', 'unitkerja'], 2) : 2;
  const startIndex = hasHeader ? index(['tanggalawal', 'awalkontrak', 'awalcontrak', 'awalcontract', 'startdate', 'tanggalmulai', 'mulai'], 3) : numberBeforeDates ? 4 : 3;
  const endIndex = hasHeader ? index(['tanggalakhir', 'akhirkontrak', 'akhircontrak', 'akhircontract', 'enddate', 'tanggalselesai', 'selesai'], 4) : numberBeforeDates ? 5 : 4;
  const numberIndex = hasHeader ? index(['nomorkontrak', 'contractnumber', 'nomor', 'nokontrak'], 5) : numberBeforeDates ? 3 : 5;
  if (hasHeader && (startIndex < 0 || endIndex < 0 || numberIndex < 0)) throw Object.assign(new Error('Header Excel harus memiliki kolom NIP, Nama, Departemen, Awal Kontrak, Akhir Kontrak, dan Nomor Kontrak.'), { status: 400 });
  const results: { row: number; nip?: string; success: boolean; skipped?: boolean; message: string }[] = [];
  for (let i = hasHeader ? headerRow + 1 : 0; i < rows.length; i += 1) {
    const row = rows[i] as unknown[]; const cellValues = row.map(text); const contractCell = cellValues.find(value => isContractNumber(value) && !dateLike(value)); const rawNip = contractCell && text(row[nipIndex]) === contractCell ? '' : text(row[nipIndex]); const rawName = text(row[nameIndex]); const rawDepartment = text(row[departmentIndex]); const rawNumber = text(row[numberIndex]);
    if (!rawNip && !rawName && !rawDepartment && !rawNumber && row.every(value => !text(value))) continue;
    const rawStartDate = text(row[startIndex]), rawEndDate = text(row[endIndex]);
    let startDate = date(row[startIndex]), endDate = date(row[endIndex]);
    if (!startDate || !endDate) { const dateCells = row.map(date).filter(Boolean); startDate ||= dateCells[0] ?? ''; endDate ||= dateCells[1] ?? ''; }
    const resolvedStart = startDate;
    const resolvedEnd = endDate;
    // Accept either D=number,E=start,F=end or D=start,E=end,F=number,
    // even when the spreadsheet header uses an unrecognized label.
    const rawContractNumber = hasHeader ? [row[numberIndex], ...row.slice(3, 6)].find(value => { const valueText = text(value); return Boolean(valueText) && valueText !== '-' && !dateLike(value) && valueText !== rawNip && valueText !== rawName && valueText !== rawDepartment; }) : contractCell || row[numberIndex];
    const input: ImportRow = { nip: rawNip, employeeName: rawName || undefined, department: rawDepartment || undefined, startDate: resolvedStart, endDate: resolvedEnd, contractNumber: contractNumber(rawContractNumber, resolvedStart) };
    if (!input.contractNumber && (!input.nip || !input.startDate || !input.endDate)) continue;
    try { if (!input.nip || !input.startDate || !input.endDate) throw new Error(`Tanggal kontrak tidak valid. Kolom D (awal): "${rawStartDate || '-'}", kolom E (akhir): "${rawEndDate || '-'}". Gunakan format DD/MM/YYYY, misalnya 16/09/2026.`); await create(input, by, { allowInactive: true, allowMissingHris: true }); results.push({ row: i + 1, nip: input.nip, success: true, message: 'Berhasil diimport.' }); }
    catch (error) { const duplicate = error instanceof Error && 'code' in error && (error as Error & { code?: unknown }).code === 'DUPLICATE'; results.push({ row: i + 1, nip: input.nip, success: false, skipped: duplicate, message: error instanceof Error ? error.message : 'Baris gagal diimport.' }); }
  }
  return { total: results.length, imported: results.filter(item => item.success).length, skipped: results.filter(item => item.skipped).length, failed: results.filter(item => !item.success && !item.skipped).length, results };
}

export async function exportWorkbook() {
  const table = 'dbo.EmployeeContracts';
  const result = await (await getPool()).request().query(`SELECT c.NIP AS NIP,c.EmployeeNameSnapshot AS NamaKaryawan,c.DepartmentSnapshot AS Departemen,c.ContractNumber AS NomorKontrak,c.ContractStartDate AS AwalKontrak,c.ContractEndDate AS AkhirKontrak,c.CreatedByNIP AS CreatedByNIP,cr.${quoteIdentifier(authConfig.hrisNameColumn)} AS DiinputOleh FROM ${table} c LEFT JOIN ${quoteIdentifier(authConfig.hrisTable)} cr ON cr.${quoteIdentifier(authConfig.hrisNipColumn)}=c.CreatedByNIP ORDER BY c.ContractStartDate DESC,c.Id DESC`);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BMC Kontrak Karyawan';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Laporan Kontrak', { properties: { defaultRowHeight: 20 }, views: [{ state: 'frozen', ySplit: 4 }] });
  sheet.mergeCells('A1:G1');
  sheet.getCell('A1').value = 'LAPORAN KONTRAK KARYAWAN';
  sheet.getCell('A1').font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1F5C' } };
  sheet.getRow(1).height = 30;
  sheet.mergeCells('A2:G2');
  sheet.getCell('A2').value = `Diekspor ${new Date().toLocaleDateString('id-ID')}`;
  sheet.getCell('A2').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF6B7A9E' } };
  sheet.mergeCells('A3:G3');
  sheet.getCell('A3').value = 'PT Braja Mukti Cakra | Administrasi Human Capital';
  sheet.getCell('A3').font = { name: 'Arial', size: 10, color: { argb: 'FF6B7A9E' } };
  const logoPath = path.resolve(__dirname, '../../../frontend/src/assets/logobmcbg1.png');
  if (fs.existsSync(logoPath)) {
    const imageId = workbook.addImage({ filename: logoPath, extension: 'png' });
    sheet.addImage(imageId, { tl: { col: 5.95, row: 0.15 }, ext: { width: 125, height: 34 } });
  }
  const headers = ['NIP', 'Nama Karyawan', 'Departemen', 'Nomor Kontrak', 'Awal Kontrak', 'Akhir Kontrak', 'Diinput Oleh'];
  sheet.addRow(headers);
  const headerRow = sheet.getRow(4);
  headerRow.height = 24;
  headerRow.eachCell(cell => { cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4A843' } }; cell.alignment = { vertical: 'middle', horizontal: 'left' }; });
  result.recordset.forEach((row: any) => {
    const output = sheet.addRow([text(row.NIP), text(row.NamaKaryawan), text(row.Departemen), text(row.NomorKontrak), row.AwalKontrak ? new Date(row.AwalKontrak) : null, row.AkhirKontrak ? new Date(row.AkhirKontrak) : null, text(row.DiinputOleh) || text(row.CreatedByNIP)]);
    output.eachCell(cell => { cell.font = { name: 'Arial', size: 10, color: { argb: 'FF171717' } }; cell.alignment = { vertical: 'middle' }; });
    output.getCell(5).numFmt = 'dd/mm/yyyy'; output.getCell(6).numFmt = 'dd/mm/yyyy';
    if (output.number % 2 === 1) output.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FD' } }; });
  });
  sheet.columns = [{ width: 13 }, { width: 30 }, { width: 20 }, { width: 27 }, { width: 16 }, { width: 16 }, { width: 24 }];
  sheet.autoFilter = { from: 'A4', to: `G${Math.max(4, sheet.rowCount)}` };
  sheet.eachRow(row => row.eachCell(cell => { cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDE1EF' } } }; }));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
