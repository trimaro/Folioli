import { Trash2, AlertTriangle, Moon, Sun, Monitor, User, LogOut, Shield, Database, Bell, CreditCard, Bot, Upload, Tags, ChevronDown } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { LearnedMappings } from "@/lib/categories";

interface SettingsPageProps {
    onDeleteAllTransactions: () => Promise<void>;
    learnedMappings?: LearnedMappings;
    onForgetMapping?: (key: string) => Promise<void>;
}

export function SettingsPage({
    onDeleteAllTransactions,
    learnedMappings,
    onForgetMapping,
}: SettingsPageProps) {
    // State for all settings
    const [currency, setCurrency] = useState("USD");
    const { theme, setTheme } = useTheme();
    const [aiSearch, setAiSearch] = useState(true);
    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        weekly: false
    });
    const [backupFreq, setBackupFreq] = useState("weekly");

    const learnedList = useMemo(() => {
        if (!learnedMappings) return [];
        return [...learnedMappings.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [learnedMappings]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [learnedOpen, setLearnedOpen] = useState(false);

    // Load settings from localStorage on mount
    useEffect(() => {
        const storedCurrency = localStorage.getItem("folioli_currency");
        if (storedCurrency) setCurrency(storedCurrency);

        // Theme is handled by ThemeProvider

        const storedAi = localStorage.getItem("folioli_ai_search");
        if (storedAi) setAiSearch(storedAi === "true");

        const storedBackup = localStorage.getItem("folioli_backup");
        if (storedBackup) setBackupFreq(storedBackup);

        const storedNotifs = localStorage.getItem("folioli_notifications");
        if (storedNotifs) {
            try {
                setNotifications(JSON.parse(storedNotifs));
            } catch (e) { console.error("Failed to parse notifications", e); }
        }
    }, []);

    // Persist changes
    const updateCurrency = (val: string) => {
        setCurrency(val);
        localStorage.setItem("folioli_currency", val);
    };

    // Theme update is handled by useTheme hook

    const updateAiSearch = (val: boolean) => {
        setAiSearch(val);
        localStorage.setItem("folioli_ai_search", String(val));
    };

    const updateBackup = (val: string) => {
        setBackupFreq(val);
        localStorage.setItem("folioli_backup", val);
    };

    const toggleNotification = (key: keyof typeof notifications) => {
        const newNotifs = { ...notifications, [key]: !notifications[key] };
        setNotifications(newNotifs);
        localStorage.setItem("folioli_notifications", JSON.stringify(newNotifs));
    };

    const handleDeleteAll = async () => {
        setIsDeleting(true);
        try {
            await onDeleteAllTransactions();
            setShowDeleteConfirm(false);
        } catch (e) {
            console.error("Failed to delete transactions:", e);
            alert("Failed to delete transactions.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <h2 className="text-2xl font-bold text-foreground mb-8">Settings</h2>

            <div className="space-y-8">
                {/* Learned merchants */}
                <section>
                    <div className="bg-card rounded-2xl shadow-sm border border-border">
                        <button
                            type="button"
                            onClick={() => setLearnedOpen((open) => !open)}
                            aria-expanded={learnedOpen}
                            className={`sticky top-0 z-10 w-full p-4 flex items-center justify-between gap-3 bg-card text-left hover:bg-muted/60 transition-colors ${
                                learnedOpen ? "rounded-t-2xl border-b border-border shadow-sm" : "rounded-2xl"
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-400 rounded-lg flex-shrink-0">
                                    <Tags className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-medium text-foreground">Learned merchants</p>
                                    <p className="text-sm text-muted-foreground">
                                        {learnedList.length === 0
                                            ? "Merchants you recategorize will appear here"
                                            : `${learnedList.length} remembered ${learnedList.length === 1 ? "merchant" : "merchants"}`}
                                    </p>
                                </div>
                            </div>
                            <ChevronDown
                                className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ${learnedOpen ? "" : "-rotate-90"}`}
                            />
                        </button>
                        {learnedOpen && (
                            learnedList.length === 0 ? (
                                <p className="p-4 text-sm text-muted-foreground">
                                    No learned merchants yet. When you correct a category and save, that merchant will be remembered here.
                                </p>
                            ) : (
                                <ul className="divide-y divide-border">
                                    {learnedList.map(([key, category]) => (
                                        <li key={key} className="p-4 flex items-center justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="font-medium text-foreground truncate">{key}</p>
                                                <p className="text-sm text-muted-foreground">{category}</p>
                                            </div>
                                            {onForgetMapping && (
                                                <button
                                                    type="button"
                                                    onClick={() => onForgetMapping(key)}
                                                    className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline flex-shrink-0"
                                                >
                                                    Forget
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )
                        )}
                    </div>
                </section>

                {/* General Settings */}
                <section>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 pl-1">General</h3>
                    <div className="bg-card rounded-2xl shadow-sm border border-border divide-y divide-border overflow-hidden">

                        {/* Currency */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Default Currency</p>
                                    <p className="text-sm text-muted-foreground">Select your primary currency for reports</p>
                                </div>
                            </div>
                            <select
                                value={currency}
                                onChange={(e) => updateCurrency(e.target.value)}
                                className="bg-muted border border-border text-foreground text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2.5 min-w-[100px]"
                            >
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                                <option value="JPY">JPY (¥)</option>
                                <option value="CAD">CAD ($)</option>
                            </select>
                        </div>

                        {/* Theme */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                                    {theme === 'light' ? <Sun className="w-5 h-5" /> : theme === 'dark' ? <Moon className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Appearance</p>
                                    <p className="text-sm text-muted-foreground">Customize how Folioli looks on your device</p>
                                </div>
                            </div>
                            <div className="flex bg-muted p-1 rounded-lg">
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`p-2 rounded-md transition-all ${theme === 'light' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="Light Mode"
                                >
                                    <Sun className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`p-2 rounded-md transition-all ${theme === 'dark' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="Dark Mode"
                                >
                                    <Moon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setTheme('system')}
                                    className={`p-2 rounded-md transition-all ${theme === 'system' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="System Preference"
                                >
                                    <Monitor className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Notification Settings */}
                        <div className="p-4">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg mt-1">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-foreground mb-1">Notifications</p>
                                    <div className="space-y-3">
                                        <label className="flex items-center justify-between cursor-pointer">
                                            <span className="text-sm text-muted-foreground">Email Notifications</span>
                                            <input
                                                type="checkbox"
                                                className="toggle toggle-success toggle-sm"
                                                checked={notifications.email}
                                                onChange={() => toggleNotification('email')}
                                            />
                                        </label>
                                        <label className="flex items-center justify-between cursor-pointer">
                                            <span className="text-sm text-muted-foreground">Push Notifications</span>
                                            <input
                                                type="checkbox"
                                                className="toggle toggle-success toggle-sm"
                                                checked={notifications.push}
                                                onChange={() => toggleNotification('push')}
                                            />
                                        </label>
                                        <label className="flex items-center justify-between cursor-pointer">
                                            <span className="text-sm text-muted-foreground">Weekly Reports</span>
                                            <input
                                                type="checkbox"
                                                className="toggle toggle-success toggle-sm"
                                                checked={notifications.weekly}
                                                onChange={() => toggleNotification('weekly')}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI Search */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">AI Enhanced Search</p>
                                    <p className="text-sm text-muted-foreground">Allow AI to index transactions for natural language search</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={aiSearch} onChange={(e) => updateAiSearch(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                    </div>
                </section>

                {/* Account Settings */}
                <section>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 pl-1">Account</h3>
                    <div className="bg-card rounded-2xl shadow-sm border border-border divide-y divide-border overflow-hidden">

                        {/* Profile Picture */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted text-muted-foreground rounded-full">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Profile Picture</p>
                                    <p className="text-sm text-muted-foreground">Update your profile avatar</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold overflow-hidden border border-border">
                                    tr
                                </div>
                                <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1">
                                    <Upload className="w-3.5 h-3.5" /> Change
                                </button>
                            </div>
                        </div>

                        {/* Password */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted text-muted-foreground rounded-lg">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Password</p>
                                    <p className="text-sm text-muted-foreground">Manage your password and security</p>
                                </div>
                            </div>
                            <button className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition">
                                Change Password
                            </button>
                        </div>

                        {/* Logout */}
                        <div className="p-4 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted text-muted-foreground rounded-lg">
                                    <LogOut className="w-5 h-5" />
                                </div>
                                <p className="font-medium text-foreground">Log Out</p>
                            </div>
                            <div className="text-muted-foreground">→</div>
                        </div>

                    </div>
                </section>

                {/* Data & Privacy */}
                <section>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 pl-1">Data & Privacy</h3>
                    <div className="bg-card rounded-2xl shadow-sm border border-border divide-y divide-border overflow-hidden">

                        {/* Backup Frequency */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg">
                                    <Database className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Backup Frequency</p>
                                    <p className="text-sm text-muted-foreground">How often should we backup your data?</p>
                                </div>
                            </div>
                            <select
                                value={backupFreq}
                                onChange={(e) => updateBackup(e.target.value)}
                                className="bg-muted border border-border text-foreground text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block p-2.5"
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="off">Off</option>
                            </select>
                        </div>

                        {/* Delete Account */}
                        <div className="p-4 flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Delete Account</p>
                                    <p className="text-sm text-muted-foreground">Permanently delete your account</p>
                                </div>
                            </div>
                            <button className="text-red-600 text-sm font-medium hover:underline">
                                Delete Account
                            </button>
                        </div>
                    </div>
                </section>

                {/* Danger Zone */}
                <section>
                    <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-4 pl-1 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Danger Zone
                    </h3>
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl overflow-hidden p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-semibold text-red-900 dark:text-red-200">Delete All Transactions</h4>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-1 opacity-80">
                                    Permanently remove all transaction data. This cannot be undone.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition shadow-sm"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete All
                            </button>
                        </div>
                    </div>
                </section>



                <div className="text-center text-xs text-muted-foreground pt-8">
                    Folioli v1.0.2 • Build 2024.1
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {
                showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={() => setShowDeleteConfirm(false)}>
                        <div className="bg-card rounded-2xl shadow-2xl p-6 max-w-md mx-4 transform transition-all scale-100 border border-border" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-4 mb-5">
                                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full flex-shrink-0">
                                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground leading-tight">Delete All Transactions?</h3>
                                    <p className="text-sm text-muted-foreground mt-1">This action is permanent.</p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                                You are about to permanently delete <strong>all transaction data</strong> from your local database.
                                This action cannot be undone and no backups will be available unless you've exported your data.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted focus:ring-2 focus:ring-border transition-all"
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAll}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-100 transition-all disabled:opacity-70 flex items-center gap-2"
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        "Yes, Delete Everything"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
