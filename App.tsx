
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { readLicensePlates, detectViolations } from './services/geminiService';

interface DetectionRecord {
    id: string;
    plates: string[];
    violation: string;
}

const App: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
    const [criminalPlates, setCriminalPlates] = useState<string>("");
    const [detectedPlates, setDetectedPlates] = useState<string[]>([]);
    const [detectionHistory, setDetectionHistory] = useState<DetectionRecord[]>([]);
    const [violations, setViolations] = useState<string>("");
    const [criminalAlertLog, setCriminalAlertLog] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const historyContainerRef = useRef<HTMLDivElement>(null);


    // Load stored data from localStorage on initial render
    useEffect(() => {
        // Load Detection History
        try {
            const storedHistory = localStorage.getItem('detectionHistoryDB');
            if (storedHistory) {
                const parsedHistory = JSON.parse(storedHistory);
                if (parsedHistory.length > 0 && typeof parsedHistory[0].plate === 'string') {
                    localStorage.removeItem('detectionHistoryDB');
                    setDetectionHistory([]);
                } else {
                    setDetectionHistory(parsedHistory);
                }
            }
        } catch (e) {
            console.error("Failed to parse stored history", e);
            localStorage.removeItem('detectionHistoryDB');
        }

        // Load Criminal Alert Log
        try {
            const storedAlerts = localStorage.getItem('criminalAlertLogDB');
            if (storedAlerts) {
                setCriminalAlertLog(JSON.parse(storedAlerts));
            }
        } catch (e) {
            console.error("Failed to parse stored criminal alerts", e);
            localStorage.removeItem('criminalAlertLogDB');
        }
    }, []);

    // Scroll detection history to the bottom when a new entry is added
    useEffect(() => {
        if (historyContainerRef.current) {
            historyContainerRef.current.scrollTop = historyContainerRef.current.scrollHeight;
        }
    }, [detectionHistory]);
    
    const hasViolation = (violationText: string): boolean => {
        return violationText && violationText.trim().toUpperCase() !== 'NONE';
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreviewUrl(URL.createObjectURL(file));
            setDetectedPlates([]);
            setViolations("");
            setError(null);
            setProcessedImageUrl(null);
        }
    };

    const processImage = useCallback(async () => {
        if (!imageFile || !imagePreviewUrl) {
            setError("Please select an image file first.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setDetectedPlates([]);
        setViolations("");
        setProcessedImageUrl(imagePreviewUrl);

        try {
            const [platesResult, violationsResult] = await Promise.all([
                readLicensePlates(imageFile),
                detectViolations(imageFile)
            ]);

            setDetectedPlates(platesResult);
            setViolations(violationsResult);
            
            const plateFound = platesResult.length > 0;
            const violationFound = hasViolation(violationsResult);

            if (plateFound || violationFound) {
                const newRecord: DetectionRecord = {
                    id: `${Date.now()}-record`,
                    plates: platesResult,
                    violation: violationsResult,
                };
                
                setDetectionHistory(prevHistory => {
                    const updatedHistory = [...prevHistory, newRecord];
                    localStorage.setItem('detectionHistoryDB', JSON.stringify(updatedHistory));
                    return updatedHistory;
                });
            }

            const criminalPlateList = criminalPlates
                .split('\n')
                .map(p => p.trim().toUpperCase())
                .filter(p => p);

            if (criminalPlateList.length > 0 && platesResult.length > 0) {
                const detectedPlateList = platesResult.map(p => p.trim().toUpperCase());
                const matchedPlates = detectedPlateList.filter(dp => criminalPlateList.includes(dp));
                
                if (matchedPlates.length > 0) {
                    setCriminalAlertLog(prevLog => {
                        const newPlates = matchedPlates.filter(p => !prevLog.includes(p));
                        if (newPlates.length > 0) {
                            const updatedLog = [...prevLog, ...newPlates];
                            localStorage.setItem('criminalAlertLogDB', JSON.stringify(updatedLog));
                            return updatedLog;
                        }
                        return prevLog;
                    });
                }
            }

        } catch (err: any) {
            console.error("Error processing image:", err);
            setError(err.message || "An unexpected error occurred during analysis.");
        } finally {
            setIsLoading(false);
        }
    }, [imageFile, imagePreviewUrl, criminalPlates]);
    
    const handleClearCriminalPlates = () => {
        setCriminalPlates("");
    };

    const handleClearDatabase = () => {
        if (window.confirm("Are you sure you want to permanently delete all detection history and the criminal alert log? This action cannot be undone.")) {
            setDetectionHistory([]);
            setCriminalAlertLog([]);
            setDetectedPlates([]);
            setViolations("");
            setProcessedImageUrl(null);
            setImageFile(null);
            setImagePreviewUrl(null);
            setError(null);
            
            localStorage.removeItem('detectionHistoryDB');
            localStorage.removeItem('criminalAlertLogDB');

            setStatusMessage("Database and logs successfully cleared.");
            setTimeout(() => setStatusMessage(null), 3000);
        }
    };

    const outsetBorderStyle = "border-2 border-t-gray-100 border-l-gray-100 border-b-gray-500 border-r-gray-500";
    const insetBorderStyle = "border-2 border-t-gray-500 border-l-gray-500 border-b-gray-100 border-r-gray-100";
    const buttonStyle = `px-4 py-2 ${outsetBorderStyle} bg-gray-300 active:border-t-gray-500 active:border-l-gray-500 active:border-b-gray-100 active:border-r-gray-100 disabled:text-gray-500`;

    const TrashIcon = () => (
        <svg className="inline-block h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
        </svg>
    );

    return (
        <div className="min-h-screen bg-[#C0C0C0] text-black font-serif p-4">
            <div className="max-w-6xl mx-auto">
                <header className="text-center mb-4">
                    <h1 className="text-3xl font-bold">Intelligent Traffic Violation & Criminal Tracking System</h1>
                    <p className="text-sm">An advanced system for modern law enforcement.</p>
                    <hr className="border-t-gray-500 border-b-gray-100 mt-2" />
                </header>

                <div className="flex flex-col md:flex-row gap-4">
                    <aside className="md:w-1/3 space-y-4">
                        <div className={`p-4 ${outsetBorderStyle} bg-gray-300`}>
                             <h2 className="text-xl font-bold mb-2">Control Panel</h2>
                             <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label htmlFor="criminal-plates" className="block font-bold">Criminal Plates DB:</label>
                                    <button
                                        onClick={handleClearCriminalPlates}
                                        disabled={isLoading || criminalPlates.length === 0}
                                        className={`px-2 py-1 text-xs ${outsetBorderStyle} bg-gray-300 active:border-t-gray-500 active:border-l-gray-500 active:border-b-gray-100 active:border-r-gray-100 disabled:text-gray-500 disabled:opacity-60`}
                                        title="Clear criminal plates list"
                                    >
                                       <TrashIcon /> Clear List
                                    </button>
                                </div>
                                <textarea
                                    id="criminal-plates"
                                    rows={5}
                                    value={criminalPlates}
                                    onChange={(e) => setCriminalPlates(e.target.value)}
                                    disabled={isLoading}
                                    className={`w-full p-1 ${insetBorderStyle} bg-white font-mono text-sm`}
                                    placeholder="ABC-1234&#10;XYZ-5678"
                                />
                            </div>
                        </div>

                        <div className={`p-4 ${outsetBorderStyle} bg-gray-300`}>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-bold">Detection History</h3>
                                <button
                                    onClick={handleClearDatabase}
                                    disabled={isLoading || (detectionHistory.length === 0 && criminalAlertLog.length === 0)}
                                    className={`px-2 py-1 text-xs ${outsetBorderStyle} bg-red-400 active:border-t-gray-500 active:border-l-gray-500 active:border-b-gray-100 active:border-r-gray-100 disabled:text-gray-500 disabled:opacity-60`}
                                    title="Clear all detection history and logs"
                                >
                                    Clear Database
                                </button>
                            </div>
                             {statusMessage && <p className="text-sm text-green-700 mb-2">{statusMessage}</p>}
                            <div ref={historyContainerRef} className={`p-1 h-40 overflow-y-auto ${insetBorderStyle} bg-white`}>
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="sticky top-0 bg-gray-300">
                                        <tr>
                                            <th className="p-1 font-bold border-b-2 border-gray-500 text-gray-600">Liscence Plate</th>
                                            <th className="p-1 font-bold border-b-2 border-gray-500 text-gray-600">Violation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detectionHistory.length > 0 ? (
                                            detectionHistory.map((record) => (
                                                <tr key={record.id} className="border-b border-gray-400">
                                                    <td className="p-1 align-top text-gray-800">
                                                        {record.plates.length > 0 ? (
                                                            <p className="font-mono">{record.plates.join(', ')}</p>
                                                        ) : (
                                                            <p>N/A</p>
                                                        )}
                                                    </td>
                                                    <td className="p-1 align-top text-gray-800">
                                                        <p className="whitespace-pre-wrap">
                                                            {hasViolation(record.violation) ? record.violation : "None"}
                                                        </p>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={2} className="p-4 text-center text-gray-600">History is empty.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div className={`p-4 ${outsetBorderStyle} bg-gray-300`}>
                            <h3 className="text-lg font-bold">Criminal Alert Log</h3>
                            <div className={`p-1 mt-2 h-24 overflow-y-auto ${insetBorderStyle} bg-yellow-100`}>
                                {criminalAlertLog.length > 0 ? (
                                    <ul className="text-sm font-mono text-red-700">
                                        {criminalAlertLog.map((plate, index) => (
                                            <li key={index} className="p-1 border-b border-yellow-300">{plate}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="p-1 text-sm text-gray-700">No criminal plates detected yet.</p>
                                )}
                            </div>
                        </div>

                    </aside>

                    <main className="md:w-2/3 space-y-4">
                        <div className={`p-4 ${outsetBorderStyle}`}>
                            <h2 className="text-xl font-bold mb-2">Task Execution</h2>
                             <div className="space-y-2">
                                <label htmlFor="file-upload" className="block font-bold mb-1">Upload Traffic Image:</label>
                                <input id="file-upload" name="file-upload" type="file" className="text-sm" accept="image/*" onChange={handleImageSelect} disabled={isLoading} />
                                {imagePreviewUrl && <img src={imagePreviewUrl} alt="Preview" className={`mt-2 h-32 w-auto ${insetBorderStyle} p-1`} />}
                            </div>

                            <div className="mt-4">
                                <button onClick={processImage} disabled={!imageFile || isLoading} className={`${buttonStyle} w-full`}>
                                    {isLoading ? 'Processing...' : 'Process Image'}
                                </button>
                            </div>
                           {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
                        </div>

                        {processedImageUrl && !isLoading ? (
                            <div className={`p-4 ${outsetBorderStyle}`}>
                                <h3 className="text-lg font-bold mb-2">Results for Current Image</h3>
                                <div className="mt-2 space-y-4">
                                    <div className="flex justify-center">
                                         <img src={processedImageUrl} alt="Processed traffic scene" className={`max-h-64 w-auto ${insetBorderStyle} p-1`} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">Detected License Plates:</h4>
                                         {detectedPlates.length > 0 ? (
                                             <p className="font-mono text-blue-800">{detectedPlates.join(', ')}</p>
                                         ) : (
                                             <p>No new plates detected in this image.</p>
                                         )}
                                    </div>
                                    <div>
                                        <h4 className="font-bold">Observed Traffic Violations:</h4>
                                        <pre className={`w-full p-2 mt-1 whitespace-pre-wrap ${insetBorderStyle} bg-white text-sm`}>
                                            {hasViolation(violations) ? violations : "No violations detected."}
                                        </pre>
                                    </div>
                                 </div>
                            </div>
                        ) : (
                             <div className={`p-10 text-center ${outsetBorderStyle}`}>
                                <h3 className="font-bold">Awaiting Task</h3>
                                <p className="mt-2 text-sm text-gray-700">
                                    {isLoading ? "AI is processing the traffic scene... Please wait." : "Please upload a traffic image and click 'Process Image' to begin."}
                                 </p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default App;
