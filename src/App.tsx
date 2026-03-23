import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Download, Loader2, Trash2, AlertCircle, CheckCircle2, Search, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { extractTransactions, Transaction, FileData } from './services/ocrService';
import { convertToCSV, downloadCSV } from './utils';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<keyof Transaction>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    setError(null);
    setSuccess(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf']
    },
    multiple: true
  } as any);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    const allExtracted: Transaction[] = [];

    try {
      // Chunk files to process in batches of 10 for optimal speed and reliability
      const CHUNK_SIZE = 10;
      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        const chunk = files.slice(i, i + CHUNK_SIZE);
        const fileDataArray = await Promise.all(chunk.map(async (file) => ({
          data: await fileToBase64(file),
          mimeType: file.type
        })));
        
        const results = await extractTransactions(fileDataArray);
        allExtracted.push(...results);
      }
      
      setTransactions(allExtracted);
      setSuccess(`Successfully extracted ${allExtracted.length} transactions.`);
    } catch (err) {
      console.error(err);
      setError("An error occurred while processing the files. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleDownload = () => {
    if (transactions.length === 0) return;
    const csv = convertToCSV(transactions);
    downloadCSV(csv);
  };

  const clearAll = () => {
    setFiles([]);
    setTransactions([]);
    setError(null);
    setSuccess(null);
  };

  const sortedTransactions = React.useMemo(() => {
    return [...transactions].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [transactions, sortField, sortDirection]);

  const stats = React.useMemo(() => {
    const income = transactions.reduce((acc, t) => t.amount > 0 ? acc + t.amount : acc, 0);
    const spending = transactions.reduce((acc, t) => t.amount < 0 ? acc + t.amount : acc, 0);
    return {
      count: transactions.length,
      fileCount: files.length,
      income,
      spending: Math.abs(spending),
      net: income + spending
    };
  }, [transactions, files]);

  const toggleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: keyof Transaction }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-12 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-light tracking-tight mb-4"
          >
            Bank Statement <span className="font-semibold italic">OCR</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[#9e9e9e] text-lg"
          >
            Upload multiple statements to analyze your finances in bulk.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1 space-y-6">
            <div 
              {...getRootProps()} 
              className={cn(
                "border-2 border-dashed rounded-3xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[300px]",
                isDragActive ? "border-[#1a1a1a] bg-white" : "border-[#d1d1d1] hover:border-[#1a1a1a] bg-white/50",
                files.length > 0 && "min-h-[200px]"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mb-4 text-[#9e9e9e]" />
              <p className="text-sm font-medium">
                {isDragActive ? "Drop files here" : "Drag & drop statements"}
              </p>
              <p className="text-xs text-[#9e9e9e] mt-2">Multiple PDF, PNG, JPG or WebP</p>
            </div>

            {/* File List */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-black/5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#9e9e9e]">Selected Files ({files.length})</h3>
                    <button onClick={clearAll} className="text-xs text-red-500 hover:underline">Clear all</button>
                  </div>
                  <ul className="space-y-2 max-h-[300px] overflow-auto">
                    {files.map((file, idx) => (
                      <motion.li 
                        key={`${file.name}-${idx}`}
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#f9f9f9] group"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className="w-4 h-4 flex-shrink-0 text-[#9e9e9e]" />
                          <span className="text-xs truncate font-mono">{file.name}</span>
                        </div>
                        <button 
                          onClick={() => removeFile(idx)}
                          className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.li>
                    ))}
                  </ul>
                  <button
                    onClick={processFiles}
                    disabled={isProcessing}
                    className="w-full mt-6 bg-[#1a1a1a] text-white rounded-xl py-3 text-sm font-semibold hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing {files.length} files...
                      </>
                    ) : (
                      `Extract Data from ${files.length} Files`
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Stats */}
            <AnimatePresence>
              {transactions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-4"
                >
                  <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9e9e9e] mb-1">Files</p>
                    <p className="text-3xl font-light">{stats.fileCount}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9e9e9e] mb-1">Records</p>
                    <p className="text-3xl font-light">{stats.count}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9e9e9e] mb-1">Income</p>
                    <p className="text-3xl font-light text-emerald-600">
                      {stats.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9e9e9e] mb-1">Spending</p>
                    <p className="text-3xl font-light text-red-500">
                      {stats.spending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-white rounded-3xl shadow-sm border border-black/5 min-h-[500px] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-black/5 bg-white sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-medium">Transaction Details</h2>
                <div className="flex items-center gap-2">
                  {transactions.length > 0 && (
                    <>
                      <button
                        onClick={clearAll}
                        className="flex items-center gap-2 text-sm font-semibold text-red-500 bg-red-50 px-4 py-2 rounded-full hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear All
                      </button>
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 text-sm font-semibold bg-[#f5f5f5] px-4 py-2 rounded-full hover:bg-[#e5e5e5] transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Export CSV
                      </button>
                    </>
                  )}
                </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {error && (
                  <div className="m-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="m-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    {success}
                  </div>
                )}

                {sortedTransactions.length > 0 ? (
                  <div className="w-full">
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#f0f0f0]">
                            <th 
                              onClick={() => toggleSort('date')}
                              className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-[#9e9e9e] cursor-pointer hover:text-[#1a1a1a] transition-colors"
                            >
                              <div className="flex items-center">Date <SortIcon field="date" /></div>
                            </th>
                            <th 
                              onClick={() => toggleSort('description')}
                              className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-[#9e9e9e] cursor-pointer hover:text-[#1a1a1a] transition-colors"
                            >
                              <div className="flex items-center">Description <SortIcon field="description" /></div>
                            </th>
                            <th 
                              onClick={() => toggleSort('amount')}
                              className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-[#9e9e9e] text-right cursor-pointer hover:text-[#1a1a1a] transition-colors"
                            >
                              <div className="flex items-center justify-end">Amount <SortIcon field="amount" /></div>
                            </th>
                            <th 
                              onClick={() => toggleSort('notes')}
                              className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-[#9e9e9e] cursor-pointer hover:text-[#1a1a1a] transition-colors"
                            >
                              <div className="flex items-center">Notes <SortIcon field="notes" /></div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedTransactions.map((t, i) => (
                            <motion.tr 
                              key={i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: Math.min(i * 0.02, 0.5) }}
                              className="border-b border-[#f9f9f9] hover:bg-[#fcfcfc] transition-colors"
                            >
                              <td className="py-4 px-6 text-xs font-mono">{t.date}</td>
                              <td className="py-4 px-6 text-sm">{t.description}</td>
                              <td className={cn(
                                "py-4 px-6 text-sm font-mono text-right whitespace-nowrap",
                                t.amount < 0 ? "text-red-500" : "text-emerald-600"
                              )}>
                                <span className="text-[10px] uppercase font-bold mr-2 opacity-50">
                                  {t.amount < 0 ? "Spent" : "Received"}
                                </span>
                                {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-4 px-6 text-xs text-[#9e9e9e] italic">{t.notes}</td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden divide-y divide-[#f0f0f0]">
                      {/* Mobile Header Sorting */}
                      <div className="p-4 bg-[#f9f9f9] flex flex-wrap gap-2 sticky top-0 z-10">
                        <button onClick={() => toggleSort('date')} className="px-3 py-1 bg-white rounded-full text-[10px] font-bold uppercase tracking-widest border border-black/5 flex items-center">
                          Date <SortIcon field="date" />
                        </button>
                        <button onClick={() => toggleSort('description')} className="px-3 py-1 bg-white rounded-full text-[10px] font-bold uppercase tracking-widest border border-black/5 flex items-center">
                          Desc <SortIcon field="description" />
                        </button>
                        <button onClick={() => toggleSort('amount')} className="px-3 py-1 bg-white rounded-full text-[10px] font-bold uppercase tracking-widest border border-black/5 flex items-center">
                          Amt <SortIcon field="amount" />
                        </button>
                        <button onClick={() => toggleSort('notes')} className="px-3 py-1 bg-white rounded-full text-[10px] font-bold uppercase tracking-widest border border-black/5 flex items-center">
                          Notes <SortIcon field="notes" />
                        </button>
                      </div>

                      {sortedTransactions.map((t, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.5) }}
                          className="p-4 space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-mono text-[#9e9e9e]">{t.date}</span>
                            <span className={cn(
                              "text-sm font-mono font-bold",
                              t.amount < 0 ? "text-red-500" : "text-emerald-600"
                            )}>
                              {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="text-sm font-medium">{t.description}</div>
                          {t.notes && (
                            <div className="text-xs text-[#9e9e9e] italic bg-[#f9f9f9] p-2 rounded-lg">
                              {t.notes}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <div className="w-16 h-16 bg-[#f5f5f5] rounded-full flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-[#d1d1d1]" />
                    </div>
                    <p className="text-[#9e9e9e] text-sm">No transactions extracted yet.</p>
                    <p className="text-[#d1d1d1] text-xs mt-1">Upload a statement to begin.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
