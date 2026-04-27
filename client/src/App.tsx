// client/src/App.tsx - Newly created/updated file
import React, { useState } from 'react';
import CodeGeneratorPanel from './components/CodeGeneratorPanel'; // Assuming this component is created/imported

/**
 * Main layout component for the Cowork Dashboard.
 * Handles sidebar state, overall application flow, and features section.
 */
const App: React.FC = () => {
    // State to manage open/closed sidebar state
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    // State to manage the visibility of the Code Generator (using state management)
    const [isCodeGeneratorActive, setCodeGeneratorActive] = useState(false);

    // Function to toggle the visibility of the dedicated component panel
    const toggleCodeGenerator = () => {
        setCodeGeneratorActive(!isCodeGeneratorActive);
    };

    return (
        <div className="flex min-h-screen">
            {/* Sidebar Component */}
            <aside className="w-64 p-4 border-r bg-gray-50">
                <h1 className="text-2xl font-bold mb-6">Project Portal</h1>
                <nav>
                    <ul className="space-y-2">
                        <li className="cursor-pointer py-2 hover:bg-indigo-100 border-b">
                            Dashboard
                        </li>
                        {/* Button to activate the feature panel */}
                        <li className="cursor-pointer py-2 hover:bg-indigo-100 border-b" onClick={toggleCodeGenerator}>
                            Code Assistant
                        </li>
                        <li className="cursor-pointer py-2 hover:bg-indigo-100 border-b">
                            Reports
                        </li>
                    </ul>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-8">
                <h2 className="text-3xl font-semibold mb-6">
                    {isCodeGeneratorActive ? "Code Generation Toolkit" : "Welcome to the Dashboard"}
                </h2>

                {/* Conditional Component Panel - Handles routing/state */}
                {isCodeGeneratorActive && (
                    <div className="p-6 border rounded-lg bg-white shadow-lg">
                        <button onClick={toggleCodeGenerator} className="mb-4 text-sm text-red-600 hover:text-red-800">
                            &times; Close Panel
                        </button>
                        <CodeGeneratorPanel />
                    </div >
                )}

                {!isCodeGeneratorActive && (
                    <div className="p-6 border rounded-lg bg-white shadow-lg">
                        <h3 className="text-xl font-medium">Dashboard Content Here...</h3>
                    </div>
                )}
            </main>
        </div >
    );
}

/* Placeholder Component (Must be written to local file system) */
const CodeGeneratorPanel = () => (
    <div className="space-y-4">
        <h2 className="text-2xl font-semibold mt-4">✨ AI Code Companion</h2>
        <form className="space-y-4">
            <textarea
                rows={6}
                placeholder="Paste code here for context (e.g., a function, class, or snippet to expand)..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            ></textarea>
            <button 
                type="submit" 
                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-md hover:bg-indigo-700 transition duration-150"
            >
                Generate Code
            </button>
        </form>
        {/* Code output display area placeholder */}
        <div className="mt-6 p-4 border border-green-300 bg-green-50 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800">Generated Output Preview</h3>
            <p>The actual generated code will appear here.</p>
        </div>
    </div>
);

export default App;