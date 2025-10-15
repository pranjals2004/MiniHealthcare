<?php
echo"<h1>it is me...</h1>";
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $first = $_POST["first_name"];
    $last = $_POST["last_name"];
    $address = $_POST["address"];
    $phone = $_POST["phone"];

    // Database connection
    $conn = new mysqli("localhost", "root", "", "healthcare");

    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }

    $sql = "INSERT INTO appointments (first_name, last_name, address, phone) 
            VALUES ('$first', '$last', '$address', '$phone')";

    if ($conn->query($sql) === TRUE) {
        echo "Appointment booked successfully!";
    } else {
        echo "Error: " . $conn->error;
    }

    $conn->close();
}
?>
