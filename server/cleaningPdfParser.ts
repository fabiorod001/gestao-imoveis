import pdfParse from 'pdf-parse';

interface CleaningEntry {
  date: string;
  unit: string;
  value: number;
}

interface ParsedPdfData {
  entries: CleaningEntry[];
  period: {
    start: string;
    end: string;
  };
  total: number;
  errors: string[];
}

// Mapeamento COMPLETO e CORRETO das 10 propriedades do sistema
const UNIT_MAPPING: Record<string, string> = {
  // MaxHaus (várias formas de escrita)
  'MAXHAUS': 'MaxHaus 43R',
  'MAX HAUS': 'MaxHaus 43R',
  'MAXHAUS 43R': 'MaxHaus 43R',
  'MAXHAUS 43': 'MaxHaus 43R',
  
  // Sevilha G07 e 307 (ATENÇÃO: números fazem parte do nome!)
  'SEVILHA G07': 'Sevilha G07',
  'SEVILHAG07': 'Sevilha G07',
  'SEVILHA 307': 'Sevilha 307',
  'SEVILHA307': 'Sevilha 307',
  
  // Haddock Lobo
  'HADDOCK LOBO': 'Next Haddock Lobo',
  'HADDOCKLOBO': 'Next Haddock Lobo',
  'NEXT HADDOCK LOBO': 'Next Haddock Lobo',
  
  // Málaga M07 (ATENÇÃO: M07 faz parte do nome!)
  'MÁLAGA M07': 'Málaga M07',
  'MALAGAM07': 'Málaga M07',
  'MALAGA M07': 'Málaga M07', // Sem acento
  'MÁLAGAM07': 'Málaga M07',
  
  // Thera
  'THERA': 'Thera by Yoo',
  'THERA BY YOO': 'Thera by Yoo',
  
  // Living
  'LIVING': 'Living Full Faria Lima',
  'LIVING FULL': 'Living Full Faria Lima',
  'LIVING FULL FARIA LIMA': 'Living Full Faria Lima',
  
  // Casa Ibirapuera
  'CASA IBIRAPUERA': 'Casa Ibirapuera',
  'CASAIBIRAPUERA': 'Casa Ibirapuera',
  'IBIRAPUERA': 'Casa Ibirapuera',
  
  // Salas Brasal
  'SALAS BRASAL': 'Salas Brasal',
  'SALASBRASAL': 'Salas Brasal',
  'BRASAL': 'Salas Brasal',
  
  // Sesimbra Portugal
  'SESIMBRA': 'Sesimbra ap 505- Portugal',
  'SESIMBRA 505': 'Sesimbra ap 505- Portugal',
  'SESIMBRA AP 505': 'Sesimbra ap 505- Portugal',
};

function parseDate(dateStr: string): string {
  // Converte DD/MM/YYYY para YYYY-MM-DD
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return dateStr;
  
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseValue(valueStr: string): number {
  // Remove R$, espaços e converte vírgula para ponto
  const cleanValue = valueStr
    .replace(/R\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '') // Remove pontos de milhar
    .replace(',', '.'); // Converte vírgula decimal para ponto
  
  return parseFloat(cleanValue) || 0;
}

function extractPeriod(headerLine: string): { start: string; end: string } {
  // Extrai período do formato "FECHAMENTO DD/MM/YYYY À DD/MM/YYYY"
  const periodMatch = headerLine.match(/(\d{2}\/\d{2}\/\d{4})\s*[ÀàA]\s*(\d{2}\/\d{2}\/\d{4})/);
  
  if (periodMatch) {
    return {
      start: parseDate(periodMatch[1]),
      end: parseDate(periodMatch[2])
    };
  }
  
  // Se não encontrar, retorna o mês atual
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    start: firstDay.toISOString().split('T')[0],
    end: lastDay.toISOString().split('T')[0]
  };
}

// Lista de unidades conhecidas para melhor separação
const KNOWN_UNITS = [
  'SEVILHA G07', 'SEVILHA 307', 'MÁLAGA M07', 'MALAGA M07',
  'MAXHAUS', 'HADDOCK LOBO', 'THERA', 'LIVING', 
  'CASA IBIRAPUERA', 'SALAS BRASAL', 'SESIMBRA'
];

function intelligentSplit(line: string): { date: string; unit: string; value: string } | null {
  // Procura por data no início (10 caracteres)
  if (line.length < 15 || !line.match(/^\d{2}\/\d{2}\/\d{4}/)) {
    return null;
  }
  
  const dateStr = line.substring(0, 10);
  let remaining = line.substring(10);
  
  // Procura o padrão de valor no final (números com vírgula decimal)
  // Valores podem ser: 200,00 ou 350,00 ou 250,00 etc
  const valueMatch = remaining.match(/(\d{1,3}(?:\.\d{3})*,\d{2})$/);
  
  if (!valueMatch) {
    return null;
  }
  
  const valueStr = valueMatch[1];
  const unit = remaining.substring(0, remaining.length - valueStr.length);
  
  // Validação adicional: unidade não pode estar vazia
  if (!unit || unit.trim().length === 0) {
    return null;
  }
  
  return {
    date: dateStr,
    unit: unit.trim(),
    value: valueStr
  };
}

export async function parseCleaningPdf(buffer: Buffer): Promise<ParsedPdfData> {
  const data: ParsedPdfData = {
    entries: [],
    period: { start: '', end: '' },
    total: 0,
    errors: []
  };
  
  try {
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;
    
    // Divide o texto em linhas
    const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line);
    
    // Procura o cabeçalho para extrair o período
    const headerLine = lines.find((line: string) => 
      line.toUpperCase().includes('CONTROLE') || 
      line.toUpperCase().includes('LIMPEZA') ||
      line.toUpperCase().includes('FECHAMENTO')
    );
    
    if (headerLine) {
      data.period = extractPeriod(headerLine);
    }
    
    // Processa cada linha
    let isDataSection = false;
    
    for (const line of lines) {
      // Detecta início da seção de dados
      if (line.toUpperCase().includes('DATA') && line.toUpperCase().includes('UNIDADE')) {
        isDataSection = true;
        continue;
      }
      
      // Detecta linha de total
      if (line.toUpperCase().startsWith('TOTAL')) {
        const totalMatch = line.match(/([0-9.,]+)/);
        if (totalMatch) {
          data.total = parseValue(totalMatch[1]);
        }
        isDataSection = false;
        break;
      }
      
      // Processa linhas de dados
      if (isDataSection || line.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        const parsed = intelligentSplit(line);
        
        if (parsed) {
          // Verifica se a unidade está mapeada
          const unitUpper = parsed.unit.toUpperCase();
          
          // Procura o mapeamento correto
          let mappedUnit = UNIT_MAPPING[unitUpper] || 
                           UNIT_MAPPING[parsed.unit] ||
                           null;
          
          // Se não encontrou direto, tenta variações
          if (!mappedUnit) {
            // Remove espaços extras e tenta novamente
            const unitNoSpace = parsed.unit.replace(/\s+/g, '');
            mappedUnit = UNIT_MAPPING[unitNoSpace.toUpperCase()] || 
                        UNIT_MAPPING[unitNoSpace] ||
                        parsed.unit;
          }
          
          const entry: CleaningEntry = {
            date: parseDate(parsed.date),
            unit: mappedUnit || parsed.unit,
            value: parseValue(parsed.value)
          };
          
          data.entries.push(entry);
        }
      }
    }
    
    // Calcula o total das entradas processadas
    const calculatedTotal = data.entries.reduce((sum, entry) => sum + entry.value, 0);
    
    // Se não temos total do PDF, usa o calculado
    if (data.total === 0 && calculatedTotal > 0) {
      data.total = calculatedTotal;
    }
    
    // Validação final: só adiciona erro se houver discrepância significativa (> 1 real)
    if (data.total > 0 && Math.abs(calculatedTotal - data.total) > 1) {
      // Só adiciona se for uma diferença relevante, não por centavos
      const diff = Math.abs(calculatedTotal - data.total);
      if (diff > 10) {
        data.errors.push(`Atenção: diferença de ${diff.toFixed(2)} entre o total calculado e o informado no PDF`);
      }
    }
    
  } catch (error) {
    console.error('Erro ao processar PDF:', error);
    data.errors.push('Erro ao processar o arquivo PDF');
  }
  
  return data;
}