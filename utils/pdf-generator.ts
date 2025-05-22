import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Investment } from '@/app/api/investments/route';

// Extend jsPDF to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface InvestmentWithData extends Investment {
  currentPrice?: number;
  totalValue?: number;
  gainLoss?: number;
  gainLossPercentage?: number;
}

// Using generic interfaces to avoid conflicts with page.tsx interfaces
export interface PortfolioGradeData {
  overall: string;
  diversification: string;
  risk: string;
  performance: string;
  analysis: string[];
}

export interface AssetGradeData {
  symbol: string;
  grade: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

interface PortfolioReportOptions {
  investments: InvestmentWithData[];
  portfolioGrade?: PortfolioGradeData;
  assetGrades?: AssetGradeData[];
  userName?: string;
  reportDate?: Date;
}

/**
 * Generates a PDF report for a user's investment portfolio
 */
export function generatePortfolioReport({
  investments,
  portfolioGrade,
  assetGrades,
  userName = 'Investor',
  reportDate = new Date(),
}: PortfolioReportOptions): Blob {
  // Initialize PDF document
  const doc = new jsPDF();
  const dateFormatted = reportDate.toLocaleDateString();
  
  // Add title and header information
  doc.setFontSize(20);
  doc.setTextColor(0, 77, 153); // Dark blue color
  doc.text('Investment Portfolio Report', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Prepared for: ${userName}`, 20, 30);
  doc.text(`Date: ${dateFormatted}`, 20, 37);
  
  // Add portfolio summary section
  doc.setFontSize(16);
  doc.setTextColor(0, 77, 153);
  doc.text('Portfolio Summary', 20, 50);
  
  // Calculate portfolio metrics
  const totalInvested = investments.reduce((sum, inv) => sum + (inv.purchase_price * inv.shares), 0);
  const currentValue = investments.reduce((sum, inv) => sum + (inv.totalValue || 0), 0);
  const totalGainLoss = currentValue - totalInvested;
  const totalGainLossPercentage = (totalGainLoss / totalInvested) * 100;
  
  // Portfolio summary table
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.autoTable({
    startY: 55,
    head: [['Metric', 'Value']],
    body: [
      ['Total Investments', investments.length.toString()],
      ['Total Invested', `$${totalInvested.toFixed(2)}`],
      ['Current Value', `$${currentValue.toFixed(2)}`],
      ['Gain/Loss', `$${totalGainLoss.toFixed(2)} (${totalGainLossPercentage.toFixed(2)}%)`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [0, 77, 153] },
  });
  
  // Portfolio Grade if available
  if (portfolioGrade) {
    const currentY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(16);
    doc.setTextColor(0, 77, 153);
    doc.text('Portfolio Grade', 20, currentY);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.autoTable({
      startY: currentY + 5,
      head: [['Category', 'Grade']],
      body: [
        ['Overall', portfolioGrade.overall],
        ['Diversification', portfolioGrade.diversification],
        ['Risk Management', portfolioGrade.risk],
        ['Performance', portfolioGrade.performance],
      ],
      theme: 'grid',
      headStyles: { fillColor: [0, 77, 153] },
    });
    
    // Analysis and recommendations
    const analysisY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setTextColor(0, 77, 153);
    doc.text('Analysis & Recommendations', 20, analysisY);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    
    let pointY = analysisY + 8;
    portfolioGrade.analysis.forEach((point, index) => {
      doc.text(`• ${point}`, 25, pointY);
      pointY += 8;
      
      // Check if we need a new page
      if (pointY > 280) {
        doc.addPage();
        pointY = 20;
      }
    });
  }
  
  // Add a new page for investments
  doc.addPage();
  
  // Investments table
  doc.setFontSize(16);
  doc.setTextColor(0, 77, 153);
  doc.text('Investment Holdings', 20, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  
  const investmentRows = investments.map(inv => [
    inv.symbol,
    inv.name || inv.symbol,
    inv.shares.toString(),
    `$${inv.purchase_price.toFixed(2)}`,
    `$${(inv.currentPrice || 0).toFixed(2)}`,
    `$${(inv.totalValue || 0).toFixed(2)}`,
    `${(inv.gainLossPercentage || 0).toFixed(2)}%`,
  ]);
  
  doc.autoTable({
    startY: 25,
    head: [['Symbol', 'Name', 'Shares', 'Purchase Price', 'Current Price', 'Current Value', 'Return']],
    body: investmentRows,
    theme: 'grid',
    headStyles: { fillColor: [0, 77, 153] },
    styles: { overflow: 'linebreak', cellWidth: 'wrap' },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 40 },
      2: { cellWidth: 20 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
      6: { cellWidth: 20 },
    }
  });
  
  // Add individual asset analysis if available
  if (assetGrades && assetGrades.length > 0) {
    doc.addPage();
    
    doc.setFontSize(16);
    doc.setTextColor(0, 77, 153);
    doc.text('Individual Asset Analysis', 20, 20);
    
    let assetY = 30;
    
    assetGrades.forEach((asset, index) => {
      // Add a page break if needed
      if (assetY > 240) {
        doc.addPage();
        assetY = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(0, 77, 153);
      doc.text(`${asset.symbol} - Grade: ${asset.grade}`, 20, assetY);
      
      assetY += 10;
      
      // Strengths
      doc.setFontSize(12);
      doc.setTextColor(0, 102, 0); // Dark green
      doc.text('Strengths:', 25, assetY);
      
      assetY += 7;
      doc.setTextColor(0, 0, 0);
      asset.strengths.forEach(strength => {
        doc.text(`• ${strength}`, 30, assetY);
        assetY += 7;
      });
      
      assetY += 3;
      
      // Weaknesses
      doc.setFontSize(12);
      doc.setTextColor(153, 0, 0); // Dark red
      doc.text('Areas of Concern:', 25, assetY);
      
      assetY += 7;
      doc.setTextColor(0, 0, 0);
      asset.weaknesses.forEach(weakness => {
        doc.text(`• ${weakness}`, 30, assetY);
        assetY += 7;
      });
      
      assetY += 3;
      
      // Recommendations
      doc.setFontSize(12);
      doc.setTextColor(0, 77, 153); // Dark blue
      doc.text('Recommendations:', 25, assetY);
      
      assetY += 7;
      doc.setTextColor(0, 0, 0);
      asset.recommendations.forEach(rec => {
        doc.text(`• ${rec}`, 30, assetY);
        assetY += 7;
      });
      
      assetY += 15;
    });
  }
  
  // Add footer with date and page numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on ${dateFormatted} | Page ${i} of ${totalPages}`, 105, 287, { align: 'center' });
  }
  
  // Return PDF as a blob
  return doc.output('blob');
} 