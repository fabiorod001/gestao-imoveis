import pdfParse from 'pdf-parse';

interface CleaningEntry {
  date: string;
  unit: string;
  value: number;
}

interface CleaningPdfData {
  period: { start: string; end: string };
  entries: CleaningEntry[];
  total: number;
  errors: string[];
}

// Mapeamento de nomes de unidades do PDF para propriedades do sistema
const UNIT_MAPPING: Record<string, string> = {
  'MAXHAUS': 'MAXHAUS',
  'SEVILHA G07': 'SEVILHA G07',
  'SEVILHA 307': 'SEVILHA 307',
  'HADDOCK LOBO': 'HADDOCK LOBO',
  'MÁLAGA M07': 'MÁLAGA M07',
  'MALAGA M07': 'MÁLAGA M07', // Variação sem acento
  'THERA': 'THERA',
  // Adicione mais mapeamentos conforme necessário
};

function parseDate(dateStr: string): string {
  // Converte DD/MM/YYYY para YYYY-MM-DD
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
}

function parseValue(valueStr: string): number {
  // Remove espaços, converte vírgula para ponto e parseFloat
  const cleanValue = valueStr.trim()
    .replace(/\s/g, '')
    .replace('.', '')
    .replace(',', '.');
  return parseFloat(cleanValue) || 0;
}

function extractPeriod(headerLine: string): { start: string; end: string } {
  // Extrai período do cabeçalho
  const periodMatch = headerLine.match(/(\d{2}\/\d{2}\/\d{4})\s*[ÀàAa]\s*(\d{2}\/\d{2}\/\d{4})/);
  if (periodMatch) {
    return {
      start: parseDate(periodMatch[1]),
      end: parseDate(periodMatch[2])
    };
  }
  return { start: '', end: '' };
}

export async function parseCleaningPdf(buffer: Buffer): Promise<CleaningPdfData> {
  const data: CleaningPdfData = {
    period: { start: '', end: '' },
    entries: [],
    total: 0,
    errors: []
  };

  try {
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;
    
    // Divide o texto em linhas
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    // Procura o cabeçalho para extrair o período
    const headerLine = lines.find(line => 
      line.includes('CONTROLE DE LIMPEZA') && line.includes('FECHAMENTO')
    );
    
    if (headerLine) {
      data.period = extractPeriod(headerLine);
    }
    
    // Procura pelas linhas de dados (data - unidade - valor)
    let isDataSection = false;
    let totalFound = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detecta início da seção de dados
      if (line.includes('DATA') && lines[i + 1]?.includes('UNIDADE')) {
        isDataSection = true;
        continue;
      }
      
      // Detecta o total
      if (line.includes('TOTAL')) {
        totalFound = true;
        // Tenta extrair o valor total
        const totalMatch = line.match(/TOTAL\s+([0-9.,]+)/);
        if (totalMatch) {
          data.total = parseValue(totalMatch[1]);
        } else if (i + 1 < lines.length) {
          // Às vezes o valor está na próxima linha
          data.total = parseValue(lines[i + 1]);
        }
        break;
      }
      
      // Processa linhas de dados
      if (isDataSection && !totalFound) {
        // Padrão esperado: DD/MM/YYYY UNIDADE VALOR
        // Regex para capturar: data, unidade (pode ter espaços), valor
        const dataMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([0-9.,]+)$/);
        
        if (dataMatch) {
          const [, dateStr, unit, valueStr] = dataMatch;
          
          // Verifica se a unidade está mapeada
          const mappedUnit = UNIT_MAPPING[unit.trim()] || unit.trim();
          
          const entry: CleaningEntry = {
            date: parseDate(dateStr),
            unit: mappedUnit,
            value: parseValue(valueStr)
          };
          
          data.entries.push(entry);
        } else if (line.match(/^\d{2}\/\d{2}\/\d{4}/)) {
          // Se começa com data mas não conseguimos processar completamente
          data.errors.push(`Linha não processada: ${line}`);
        }
      }
    }
    
    // Validação básica
    if (data.entries.length === 0) {
      data.errors.push('Nenhuma entrada de limpeza foi encontrada no PDF');
    }
    
    // Calcula o total se não foi encontrado
    if (data.total === 0 && data.entries.length > 0) {
      data.total = data.entries.reduce((sum, entry) => sum + entry.value, 0);
    }
    
    // Verifica discrepâncias no total
    const calculatedTotal = data.entries.reduce((sum, entry) => sum + entry.value, 0);
    if (Math.abs(calculatedTotal - data.total) > 0.01) {
      data.errors.push(`Discrepância no total: calculado ${calculatedTotal.toFixed(2)}, PDF informa ${data.total.toFixed(2)}`);
    }
    
  } catch (error) {
    data.errors.push(`Erro ao processar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
  
  return data;
}

export function normalizeUnitName(unitName: string): string {
  // Normaliza o nome da unidade removendo acentos e padronizando
  return unitName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toUpperCase()
    .trim();
}