import React, { useState, useEffect } from 'react';
import { getDocuments, deleteDocument } from '../api/documents';

const Library = () => {
    const [library, setLibrary] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            const data = await getDocuments();
            setLibrary(data);
        } catch (error) {
            console.error("Failed to fetch documents", error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleDelete = async (subject, filename = null) => {
        const message = filename 
            ? `Are you sure you want to delete ${filename}?` 
            : `Are you sure you want to delete the entire subject '${subject}'?`;
            
        if (window.confirm(message)) {
            try {
                await deleteDocument(subject, filename);
                fetchDocuments();
            } catch (error) {
                console.error("Failed to delete", error);
                alert("Failed to delete document.");
            }
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500 font-bold">Loading Library...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-page-enter">
            <div>
                <h1 className="text-2xl font-black text-gray-900">My Library</h1>
                <p className="text-gray-500 text-sm font-medium mt-1">Manage your uploaded subjects and documents.</p>
            </div>

            {library.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-xl border border-gray-200">
                    <p className="text-gray-500 font-medium">Your library is empty. Upload some documents to get started!</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {library.map((subjectGroup, idx) => (
                        <div key={idx} className="card p-6 bg-white border-[0.5px] border-[#F97316]/20 rounded-xl space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                <h2 className="text-lg font-bold text-[#EA580C]">{subjectGroup.subject}</h2>
                                <button 
                                    onClick={() => handleDelete(subjectGroup.subject)}
                                    className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-md transition-colors"
                                >
                                    Delete Subject
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {subjectGroup.documents.map((doc, docIdx) => (
                                    <div key={docIdx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <svg className="w-5 h-5 text-[#F97316] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                            <span className="text-sm font-bold text-gray-700 truncate">{doc}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleDelete(subjectGroup.subject, doc)}
                                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                            title="Delete Document"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Library;
