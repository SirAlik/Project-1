'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIExplainButtonProps {
    /** Context identifier for the metric (e.g., "total_students", "attendance_rate") */
    metricId: string;
    /** Human-readable title of the metric */
    metricTitle: string;
    /** Current value of the metric */
    value?: string | number;
    /** User's role for scoped explanations */
    role?: string;
    /** Optional className for styling */
    className?: string;
}

interface AIInsight {
    observation: string;
    cause: string;
    recommendation: string;
    nextSteps: string[];
    confidence: 'high' | 'medium' | 'low';
    missingData?: string[];
}

// Mock AI insights for demonstration - will be replaced with real AI integration
const getAIInsight = (metricId: string, value?: string | number): AIInsight => {
    const insights: Record<string, AIInsight> = {
        total_students: {
            observation: `العدد الحالي للطلاب هو ${value}. هذا يمثل الحمل الأساسي على الموارد التعليمية.`,
            cause: 'يعكس هذا الرقم إجمالي الطلاب المسجلين النشطين في النظام.',
            recommendation: 'تأكد من توافق عدد المعلمين والفصول مع هذا العدد لضمان جودة التعليم.',
            nextSteps: [
                'مراجعة نسبة الطلاب إلى المعلمين',
                'التحقق من سعة الفصول الدراسية',
                'تخطيط الموارد للفصل القادم'
            ],
            confidence: 'high'
        },
        attendance_rate: {
            observation: `معدل الحضور الحالي هو ${value}%. `,
            cause: 'يتأثر معدل الحضور بعوامل متعددة منها الطقس والمناسبات والصحة العامة.',
            recommendation: 'متابعة الطلاب ذوي الغياب المتكرر والتواصل مع أولياء الأمور.',
            nextSteps: [
                'تحديد أنماط الغياب المتكرر',
                'التواصل مع أولياء أمور الطلاب المتغيبين',
                'مراجعة أسباب الغياب الشائعة'
            ],
            confidence: 'medium',
            missingData: ['بيانات الغياب المرضي', 'أسباب الغياب المسجلة']
        },
        default: {
            observation: `القيمة الحالية لهذا المؤشر هي ${value || 'غير محددة'}.`,
            cause: 'يتم احتساب هذا المؤشر بناءً على البيانات المتاحة في النظام.',
            recommendation: 'راجع التفاصيل للحصول على صورة أوضح عن الأداء.',
            nextSteps: [
                'مراجعة البيانات التفصيلية',
                'مقارنة مع الفترات السابقة',
                'تحديد مجالات التحسين'
            ],
            confidence: 'low',
            missingData: ['بيانات تاريخية للمقارنة']
        }
    };

    return insights[metricId] || insights.default;
};

export const AIExplainButton: React.FC<AIExplainButtonProps> = ({
    metricId,
    metricTitle,
    value,
    className = ''
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const insight = getAIInsight(metricId, value);

    const confidenceColors = {
        high: 'text-emerald-500 bg-emerald-500/10',
        medium: 'text-warning bg-warning/10',
        low: 'text-muted-foreground bg-muted/50'
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`p-1.5 rounded-lg hover:bg-accent/20 text-accent transition-all group ${className}`}
                title="شرح المؤشر بالذكاء الاصطناعي"
                aria-label="شرح المؤشر"
            >
                <Sparkles size={14} className="group-hover:scale-110 transition-transform" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 left-0 h-full w-full max-w-md bg-card border-r border-border shadow-2xl z-50 overflow-y-auto"
                            dir="rtl"
                        >
                            {/* Header */}
                            <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-xl bg-accent/10 text-accent">
                                        <Sparkles size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-foreground">مستشار الذكاء الاصطناعي</h2>
                                        <p className="text-xs text-muted-foreground">{metricTitle}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="absolute top-4 left-4 p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label="إغلاق"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* Confidence Badge */}
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${confidenceColors[insight.confidence]}`}>
                                    <span className="w-2 h-2 rounded-full bg-current" />
                                    ثقة التحليل: {insight.confidence === 'high' ? 'عالية' : insight.confidence === 'medium' ? 'متوسطة' : 'منخفضة'}
                                </div>

                                {/* Observation */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        الملاحظة
                                    </h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed pr-4">
                                        {insight.observation}
                                    </p>
                                </div>

                                {/* Cause */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                        السبب المحتمل
                                    </h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed pr-4">
                                        {insight.cause}
                                    </p>
                                </div>

                                {/* Recommendation */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        التوصية
                                    </h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed pr-4">
                                        {insight.recommendation}
                                    </p>
                                </div>

                                {/* Next Steps */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        الخطوات التالية
                                    </h3>
                                    <ul className="space-y-2 pr-4">
                                        {insight.nextSteps.map((step, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                <span className="text-xs text-primary mt-1">●</span>
                                                {step}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Missing Data */}
                                {insight.missingData && insight.missingData.length > 0 && (
                                    <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 space-y-2">
                                        <h3 className="text-xs font-bold text-warning">
                                            بيانات مطلوبة لتحسين التحليل
                                        </h3>
                                        <ul className="space-y-1">
                                            {insight.missingData.map((data, i) => (
                                                <li key={i} className="text-xs text-warning/80 flex items-center gap-2">
                                                    <span>•</span> {data}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
