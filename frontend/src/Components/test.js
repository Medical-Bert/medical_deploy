import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { toast } from 'react-toastify';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './test.css';



import axios from 'axios'



const Tester = () => {
    const navigate = useNavigate();
    const [uploadedFiles, setUploadedFiles] = useState([]);

    const [uploadedImage, setUploadedImage] = useState(null);
    const [imageName, setImageName] = useState(null);
    const [imgpath, setImgpath] = useState(null);
    const [value, setValue] = useState("");
    const textAreaRef = useRef(null);


    const [imgFile, setImgFile] = useState(null);




    const handleLogoutClick = () => {
        // Your existing logout logic
        localStorage.removeItem('jwt');
        navigate('/login');

        toast.success('Logout Successful', {
            position: 'bottom-right',
            autoClose: 1400,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: 'light',
        });
    };






    const handleImageUpload = async (e) => {
        const file = e.target.files[0];

        if (file) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                setImgFile(file)
                setImageName(file.name);

                setUploadedImage(URL.createObjectURL(file));
                setImgpath(file.name);

                toast.success('Image uploaded successfully', {
                    position: 'bottom-right',
                    autoClose: 1400,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: 'light',
                });
            } catch (error) {
                console.error('Error uploading image:', error);

                toast.error('Failed to upload image', {
                    position: 'bottom-right',
                    autoClose: 1400,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: 'light',
                });
            }
        }
    };




    const [qandaContent, setQandaContent] = useState([]);





    const getans = async () => {
        const question = value;
        console.log(value);
        const flaskurl = process.env.REACT_APP_flaskurl;

        const formData = new FormData();
        formData.append('question', question);
        formData.append('flaskurl', flaskurl);
        formData.append('file', imgFile);
        console.log(imgFile.name);

        try {
            const response = await axios.post('https://medicalbert-api.onrender.com/modeloutput', formData, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'multipart/form-data', // Important for file uploads
                },
            });

            // Log the predicted value from the Flask app
            console.log('predicted value', response.data);

            // Assuming you want to store the predicted value in 'pAnswer'
            const pAnswer = response.data.prediction;

            // Continue with any additional logic using pAnswer
            console.log('Final method:', pAnswer);

            const newContent = [
                <>
                    <div key={question} style={{ backgroundColor: '#000000', padding: '8px' }}>
                        <strong style={{ color: '#18e74f' }}>Question:</strong> {question}
                    </div>
                    <div className='my-2' style={{ backgroundColor: '#000000', padding: '8px', borderRadius: '8px' }}>
                        <div key={pAnswer} style={{ padding: '8px' }}>
                            <strong style={{ color: '#da591c' }}>Predicted:</strong> {pAnswer}
                        </div>
                    </div>
                    <br />
                </>
            ];

            setQandaContent((prevContent) => [...prevContent, ...newContent]);

            // Clear the input field
            setValue('');

            // You can also scroll the "qanda" div to the bottom to show the latest Q&A
            const qandaDiv = document.getElementById('qanda');
            qandaDiv.scrollTop = qandaDiv.scrollHeight;
        } catch (error) {
            console.log('sleep');
            // Log any errors that occurred during the request
            console.log('Error:', error.message);
        }
    };


    const handleChange = (e) => {
        setValue(e.target.value);
    };



    const handleClearImage = () => {
        setUploadedImage(null);
        setImgFile(null);
        // Add any other logic you want to perform when clearing the image
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        getans();
    };

    const fetchQuestions = async () => {
        if (!imageName) {
            return;
        }

        const csvFilePath = '../data/total.csv'; 

        try {
            // Fetch the CSV file
            const response = await axios.get(csvFilePath);
            const csvData = response.data;

            // Parse CSV data
            const rows = csvData.split('\n');
            const headers = rows[0].split(',');

            // Find the index of the 'image' column in the CSV file
            const imageIndex = headers.findIndex((header) => header.trim() === 'image');

            // Find rows with matching image name
            const matchingRows = rows
                .map((row) => row.split(','))
                .filter((row) => row[imageIndex] === imageName);

            // Generate modal content or show a message
            const modalContent = matchingRows.length > 0
                ? matchingRows.map((row, index) => (
                    <div key={index}>
                        <p><strong>Image:</strong> {row[0]}</p>
                        <p><strong>Question:</strong> {row[1]}</p>
                        <p><strong>Answer:</strong> {row[2]}</p>
                        <hr />
                    </div>
                ))
                : <p>No suggestions available for this image.</p>;

            setModalContent(modalContent);

            
        } catch (error) {
            console.error('Error fetching CSV data:', error);

            toast.error('Failed to fetch suggestions', {
                position: 'bottom-right',
                autoClose: 1400,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: 'light',
            });
        }
    };




    return (
        <div className="container-fluid">
            

            <div className="modal fade" id="example" aria-labelledby="exampleModalLabel">
                <div className="modal-dialog modal-xl">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h1 className="modal-title fs-5" id="exampleModalLabel">
                                Suggested questions
                            </h1>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body d-flex justify-content-center">
                            {modalContent}
                        </div>
                    </div>
                </div>
            </div>

            <ToastContainer
                position="bottom-right"
                autoClose={800}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />
            <div className="row">
                <div className="previous_chat col-2 d-flex flex-column align-items-start mb-3">
                    <div>
                        <br />
                        <strong>Medical Image </strong>


                        <p>Visual Question Answering</p>
                    </div>
                    <div className="mb-auto p-2">
                        <button className='btn btn-secondary'>new chat</button>
                    </div>
                    <div className="my-5 mx-3">
                        <div>
                            <h4>Welcome user</h4>
                        </div>
                        <br />
                        <div>
                            <button className="btn btn-secondary" onClick={handleLogoutClick}>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
                <div className="current_chat col-10 mb-3">
                    <div className="row">
                        <div className="col-6">
                            <br />
                            <br />

                            {!uploadedImage && (
                                <div className='dottedborder'>
                                    <input type="file" id="userimage" onChange={handleImageUpload} />
                                    <p>upload here</p>
                                </div>
                            )}
                            {uploadedImage && (
                                <div>
                                    <img
                                        src={uploadedImage}
                                        alt="Uploaded Image"
                                        className="hieght-and-width mx-2"
                                    />
                                    <button className="btn btn-danger btn my-2 mx-3" type="button" onClick={fetchQuestions}>
                                        Suggestions
                                    </button>
                                    <button className='btn btn-danger my-2 mx-3' onClick={handleClearImage}>clear</button>
                                </div>
                            )}
                        </div>
                        {uploadedImage && (
                            <div className="col-6 scrollable-div my-3 bordered-primary" id="qanda">
                                {qandaContent}
                            </div>
                        )}
                    </div>
                    {uploadedImage && (
                        <div className='p-3'>
                            <form onSubmit={handleSubmit}>
                                <div className='d-flex text-inline'>
                                    <textarea
                                        onChange={handleChange}
                                        placeholder="Ask any question related to the image:"
                                        ref={textAreaRef}
                                        rows={4}
                                        value={value}
                                        style={{ maxHeight: '150px', overflowY: 'auto' }}
                                    />
                                    <button type='submit' className='btn btn-primary mx-2 btn-lg'>submit</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Tester;