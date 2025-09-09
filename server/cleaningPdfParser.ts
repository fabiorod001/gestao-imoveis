
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
// Adicione todas as variações possíveis aqui
const UNIT_MAPPING: Record<string, string> = {
  // MaxHaus
  'MAXHAUS': 'MaxHaus 43R',
  'MAX HAUS': 'MaxHaus 43R',
  'MAXHAUS 43R': 'MaxHaus 43R',
  'MAXHAUS 43': 'MaxHaus 43R',
  
  // Sevilha
  'SEVILHA G07': 'Sevilha G07',
  'SEVILHA 307': 'Sevilha 307',
  'SEVILHA': 'Sevilha',
  
  // Haddock Lobo
  'HADDOCK LOBO': 'Next Haddock Lobo',
  'HADDOCK': 'Next Haddock Lobo',
  'NEXT HADDOCK': 'Next Haddock Lobo',
  'NEXT HADDOCK LOBO': 'Next Haddock Lobo',
  
  // Málaga
  'MÁLAGA M07': 'Málaga M07',
  'MALAGA M07': 'Málaga M07', // Sem acento
  'MÁLAGA': 'Málaga M07',
  'MALAGA': 'Málaga M07',
  
  // Thera
  'THERA': 'Thera by Yoo',
  'THERA BY YOO': 'Thera by Yoo',
  'THERA BY YOU': 'Thera by Yoo',
  
  // Living
  'LIVING': 'Living Full Faria Lima',
  'LIVING FULL': 'Living Full Faria Lima',
  'LIVING FARIA LIMA': 'Living Full Faria Lima',
  'LIVING FULL FARIA LIMA': 'Living Full Faria Lima',
  
  // Casa Ibirapuera
  'CASA IBIRAPUERA': 'Casa Ibirapuera',
  'IBIRAPUERA': 'Casa Ibirapuera',
  
  // Salas Brasal
  'SALAS BRASAL': 'Salas Brasal',
  'BRASAL': 'Salas Brasal',
  
  // Portugal
  'SESIMBRA': 'Sesimbra ap 505- Portugal',
  'SESIMBRA 505': 'Sesimbra ap 505- Portugal',
  'SESIMBRA AP 505': 'Sesimbra ap 505- Portugal',
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
    // Dynamically import pdf-parse
    const pdfModule = await import('pdf-parse');
    const pdfParse = pdfModule.default || pdfModule;
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;
    
    console.log('=== INÍCIO DO TEXTO EXTRAÍDO DO PDF ===');
    console.log(text);
    console.log('=== FIM DO TEXTO EXTRAÍDO DO PDF ===');
    
    // Divide o texto em linhas
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    console.log(`Total de linhas no PDF: ${lines.length}`);
    
    // Debug: mostra as primeiras 20 linhas para análise
    console.log('=== PRIMEIRAS 20 LINHAS DO PDF ===');
    lines.slice(0, 20).forEach((line, i) => {
      console.log(`Linha ${i}: ${line}`);
    });
    console.log('=== FIM DAS PRIMEIRAS LINHAS ===');
    
    // Procura o cabeçalho para extrair o período
    const headerLine = lines.find(line => 
      line.toUpperCase().includes('CONTROLE') || 
      line.toUpperCase().includes('LIMPEZA') ||
      line.toUpperCase().includes('FECHAMENTO') ||
      line.toUpperCase().includes('PERÍODO')
    );
    
    console.log('Header encontrado:', headerLine);
    
    if (headerLine) {
      data.period = extractPeriod(headerLine);
    }
    
    // Procura pelas linhas de dados (data - unidade - valor)
    let isDataSection = false;
    let totalFound = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const upperLine = line.toUpperCase();
      
      // Detecta início da seção de dados - mais flexível
      if (upperLine.includes('DATA') || 
          (i > 0 && lines[i-1].toUpperCase().includes('DATA')) ||
          line.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        
        // Se encontrou uma linha com data, assume que está na seção de dados
        if (line.match(/^\d{2}\/\d{2}\/\d{4}/)) {
          isDataSection = true;
          console.log(`Seção de dados iniciada na linha ${i}: ${line}`);
        } else if (upperLine.includes('DATA')) {
          isDataSection = true;
          console.log(`Seção de dados detectada pela palavra DATA na linha ${i}`);
          continue;
        }
      }
      
      // Detecta o total
      if (upperLine.includes('TOTAL')) {
        totalFound = true;
        console.log(`Total encontrado na linha ${i}: ${line}`);
        // Tenta extrair o valor total - mais padrões
        const totalMatch = line.match(/TOTAL[\s:]*([0-9.,]+)/i) || 
                          line.match(/([0-9.,]+)/) ||
                          (i + 1 < lines.length && lines[i + 1].match(/([0-9.,]+)/));
        if (totalMatch) {
          data.total = parseValue(totalMatch[1]);
          console.log(`Valor total extraído: ${data.total}`);
        }
        break;
      }
      
      // Processa linhas de dados
      if (isDataSection || line.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        // Múltiplos padrões de regex para maior flexibilidade
        // Padrão 1: DD/MM/YYYY UNIDADE VALOR
        let dataMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([0-9.,]+)$/);
        
        // Padrão 2: DD/MM/YYYY qualquer coisa VALOR no final
        if (!dataMatch) {
          dataMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+R?\$?\s*([0-9.,]+)$/);
        }
        
        // Padrão 3: Data e valor separados por tabs ou múltiplos espaços
        if (!dataMatch) {
          dataMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})\s{2,}(.+?)\s{2,}([0-9.,]+)$/);
        }
        
        // Padrão 4: Tenta com menos restrições
        if (!dataMatch && line.match(/^\d{2}\/\d{2}\/\d{4}/)) {
          const parts = line.split(/\s+/);
          if (parts.length >= 3) {
            const dateStr = parts[0];
            const valueStr = parts[parts.length - 1];
            const unit = parts.slice(1, -1).join(' ');
            
            if (valueStr.match(/[0-9.,]+/)) {
              dataMatch = ['', dateStr, unit, valueStr];
              console.log(`Linha processada com split: ${line}`);
            }
          }
        }
        
        if (dataMatch) {
          const [, dateStr, unit, valueStr] = dataMatch;
          
          console.log(`Entrada encontrada: Data=${dateStr}, Unidade=${unit}, Valor=${valueStr}`);
          
          // Verifica se a unidade está mapeada
          const mappedUnit = UNIT_MAPPING[unit.trim().toUpperCase()] || 
                            UNIT_MAPPING[unit.trim()] || 
                            unit.trim();
          
          const entry: CleaningEntry = {
            date: parseDate(dateStr),
            unit: mappedUnit,
            value: parseValue(valueStr)
          };
          
          data.entries.push(entry);
        } else if (line.match(/^\d{2}\/\d{2}\/\d{4}/)) {
          // Se começa com data mas não conseguimos processar completamente
          console.log(`Linha com data não processada: ${line}`);
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