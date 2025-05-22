import jsPDF from 'jspdf';
import { Investment } from '@/app/api/investments/route';

// Define types for TypeScript
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
export async function generatePortfolioReport({
  investments,
  portfolioGrade,
  assetGrades,
  userName = 'Investor',
  reportDate = new Date(),
}: PortfolioReportOptions): Promise<Blob> {
  // Initialize PDF document
  const doc = new jsPDF();
  
  try {
    // Try to dynamically import and initialize autoTable
    // This approach works better with Next.js bundling
    const autoTableModule = await import('jspdf-autotable');
    
    // Apply the plugin to jsPDF
    if (autoTableModule.default) {
      autoTableModule.default(doc);
    } else {
      // Fallback if default export is not available
      (autoTableModule as any)(doc);
    }
    
    // Now proceed with the enhanced PDF generation
    return generateEnhancedReport(doc, investments, portfolioGrade, assetGrades, userName, reportDate);
  } catch (error) {
    console.error('Error initializing autoTable:', error);
    // Fallback to basic report if autoTable can't be loaded
    return generateBasicReport(doc, investments, portfolioGrade, assetGrades, userName, reportDate);
  }
}

/**
 * Generates an enhanced PDF report using autoTable
 */
function generateEnhancedReport(
  doc: jsPDF,
  investments: InvestmentWithData[],
  portfolioGrade?: PortfolioGradeData,
  assetGrades?: AssetGradeData[],
  userName: string = 'Investor',
  reportDate: Date = new Date()
): Blob {
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
  
  try {
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
  } catch (error) {
    console.error('Error using autoTable:', error);
    // If there's an error with autoTable during generation, we'll continue with the basic content already added
  }
  
  // Add footer with date and page numbers
  try {
    // Use a safer approach to get page count
    const pageCount = (doc as any).internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on ${dateFormatted} | Page ${i} of ${pageCount}`, 105, 287, { align: 'center' });
    }
  } catch (error) {
    console.error('Error adding page numbers:', error);
    // If page numbering fails, just continue without it
  }
  
  // Return PDF as a blob
  return doc.output('blob');
}

/**
 * Fallback function to generate a basic report without using autoTable
 */
function generateBasicReport(
  doc: jsPDF,
  investments: InvestmentWithData[],
  portfolioGrade?: PortfolioGradeData,
  assetGrades?: AssetGradeData[],
  userName: string = 'Investor',
  reportDate: Date = new Date()
): Blob {
  const dateFormatted = reportDate.toLocaleDateString();
  
  // Basic header
  doc.setFontSize(20);
  doc.text('Investment Portfolio Report', 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Prepared for: ${userName}`, 20, 30);
  doc.text(`Date: ${dateFormatted}`, 20, 37);
  
  // Basic summary
  doc.setFontSize(16);
  doc.text('Portfolio Summary', 20, 50);
  
  // Calculate basic metrics
  const totalInvested = investments.reduce((sum, inv) => sum + (inv.purchase_price * inv.shares), 0);
  const currentValue = investments.reduce((sum, inv) => sum + (inv.totalValue || 0), 0);
  
  // Add basic metrics
  let y = 60;
  doc.setFontSize(12);
  doc.text(`Total Investments: ${investments.length}`, 20, y); y += 10;
  doc.text(`Total Invested: $${totalInvested.toFixed(2)}`, 20, y); y += 10;
  doc.text(`Current Value: $${currentValue.toFixed(2)}`, 20, y); y += 10;
  
  if (portfolioGrade) {
    y += 10;
    doc.setFontSize(16);
    doc.text('Portfolio Grade', 20, y); y += 10;
    doc.setFontSize(12);
    doc.text(`Overall: ${portfolioGrade.overall}`, 20, y); y += 10;
    doc.text(`Diversification: ${portfolioGrade.diversification}`, 20, y); y += 10;
    doc.text(`Risk: ${portfolioGrade.risk}`, 20, y); y += 10;
    doc.text(`Performance: ${portfolioGrade.performance}`, 20, y); y += 10;
  }
  
  // Basic investments table
  y += 10;
  doc.setFontSize(16);
  doc.text('Investments', 20, y); y += 10;
  
  doc.setFontSize(10);
  // Table header
  doc.text('Symbol', 20, y);
  doc.text('Shares', 60, y);
  doc.text('Purchase Price', 100, y);
  doc.text('Current Value', 160, y);
  y += 8;
  
  // Draw a line
  doc.line(20, y-4, 190, y-4);
  
  // Table rows
  investments.forEach(inv => {
    if (y > 270) {
      // Add a new page if we're getting close to the bottom
      doc.addPage();
      y = 20;
    }
    
    doc.text(inv.symbol, 20, y);
    doc.text(inv.shares.toString(), 60, y);
    doc.text(`$${inv.purchase_price.toFixed(2)}`, 100, y);
    doc.text(`$${(inv.totalValue || 0).toFixed(2)}`, 160, y);
    y += 8;
  });
  
  return doc.output('blob');
} 