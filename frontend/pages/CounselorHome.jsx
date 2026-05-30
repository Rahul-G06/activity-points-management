import React, { useState, useEffect, useRef } from "react";
import API from '../api/axios.js';
import { useNavigate } from "react-router-dom";
import { UserPlus, Search, ExternalLink } from "lucide-react";

function CounselorHome() {
    const [students, setStudents] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [newEmail, setNewEmail] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true); // Added for initial load state
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const fetchMyStudents = async () => {
        try {
            const res = await API.get("/api/counselor/my-students", { withCredentials: true });
            setStudents(res.data);
        } catch (err) { 
            console.error(err); 
        } finally {
            setFetchLoading(false);
        }
    };

    const fetchAllPotentialStudents = async () => {
        try {
            // Adjust this endpoint to wherever you can get a list of all students
            const res = await API.get("/api/admin/students", { withCredentials: true });
            setAllUsers(res.data.students);
        } catch (err) { console.error("Error fetching all students:", err); }
    };

    useEffect(() => {
        fetchMyStudents();
        fetchAllPotentialStudents();
        
        // Close dropdown when clicking outside
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setNewEmail(value);
        
        if (value.length > 0) {
            const matches = allUsers.filter(u => {
                // 1. Check if the user matches the search query
                const matchesSearch = u.username?.toLowerCase().includes(value.toLowerCase()) || 
                                    u.email?.toLowerCase().includes(value.toLowerCase());
                const isUnassigned = !u.counselorEmail; 

                return matchesSearch && isUnassigned;
            });
            
            setFilteredUsers(matches);
            setShowDropdown(true);
        } else {
            setShowDropdown(false);
        }
    };

    const selectUser = (user) => {
        setNewEmail(user.email);
        setShowDropdown(false);
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await API.post("/api/counselor/add-student", 
                { studentEmail: newEmail }, 
                { withCredentials: true }
            );
            
            alert(res.data.message || "Student added successfully!");
            setNewEmail("");
            await fetchMyStudents();
        } catch (err) {
            console.error("Add student error:", err);
            alert(err.response?.data?.message || "Error adding student. Check if the email exists.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-100 min-h-[calc(100vh-5rem)] py-8 px-4 md:px-8">
            <div className="max-w-6xl mx-auto bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
                <div className='mb-8'>
                  <h1 className="text-heading-xl text-gray-900">Counselor Dashboard</h1>
                  <p className='text-small-secondary mt-2'>Add and manage your assigned students</p>
                </div>

                <form onSubmit={handleAddStudent} className="flex gap-4 items-end mb-8 bg-blue-50 p-6 rounded-xl border border-blue-200">
                    <div className="flex-1 relative" ref={dropdownRef}>
                        <label className="form-label block mb-1 font-semibold text-blue-900">Search and Add Student</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                            <input 
                                type="text" 
                                placeholder="Search by name or email..."
                                className="form-input w-full pl-10 pr-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newEmail}
                                onChange={handleInputChange}
                                onFocus={() => newEmail.length > 0 && setShowDropdown(true)}
                                required
                            />
                        </div>

                        {/* Dropdown List */}
                        {showDropdown && filteredUsers.length > 0 && (
                            <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-60 overflow-y-auto">
                                {filteredUsers.map((user) => (
                                    <li 
                                        key={user._id}
                                        onClick={() => selectUser(user)}
                                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b last:border-none"
                                    >
                                        <div>
                                            <p className="font-medium text-gray-800">{user.username}</p>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                        </div>
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-400">{user.usn || 'No USN'}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`btn h-[42px] px-6 rounded-lg font-bold text-white transition ${loading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {loading ? "Adding..." : "Add"}
                    </button>
                </form>

                {/* Students Table */}
                <table className="w-full text-left border-collapse border-2 border-gray-200">
                    <thead>
                        <tr className="bg-gray-100 text-gray-600 font-semibold text-lg">
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">USN</th>
                            <th className="px-6 py-4">Branch</th>
                            <th className="px-6 py-4 text-center">Points</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {fetchLoading ? (
                            <tr>
                                <td colSpan="5" className="text-center py-10 text-gray-500">Loading students...</td>
                            </tr>
                        ) : students.length > 0 ? (
                            students.map(student => (
                                <tr 
                                    key={student._id} 
                                    // Make the whole row clickable
                                    onClick={() => navigate(`/admin/students/${student._id}`)}
                                    className="hover:bg-blue-50 transition text-gray-600 text-lg cursor-pointer group"
                                >
                                    <td className="px-6 py-4 font-medium group-hover:text-blue-700">{student.username}</td>
                                    <td className="px-6 py-4 font-mono">{student.usn || "NOT SET"}</td>
                                    <td className="px-6 py-4">{student.branch || "N/A"}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-green-600 font-bold">{(student.confirmedPoints || 0) + (student.pendingPoints || 0)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span 
                                            onClick={(e) => {
                                                e.stopPropagation(); // 🔑 prevents row click
                                                navigate(`/counselor/edit-student/${student._id}`);
                                            }}
                                            className="text-blue-600 flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        >
                                            Edit Profile <ExternalLink size={16} />
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="text-center py-10 text-gray-400 italic">No students assigned yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default CounselorHome;