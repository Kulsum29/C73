import React from 'react';
import { Text, View, TouchableOpacity, TextInput, Image, StyleSheet,
KeyboardAvoidingView, ToastAndroid } from 'react-native';
import * as Permissions from 'expo-permissions';
import { BarCodeScanner } from 'expo-barcode-scanner';
import firebase  from 'firebase';
import db from '../config'
import { ThemeProvider } from 'react-native-paper';

export default class TransactionScreen extends React.Component {
    constructor(){
      super();
      this.state = {
        hasCameraPermissions: null,
        scanned: false,
        scannedBookId: '',
        scannedStudentId:'',
        buttonState: 'normal',
        transactionMessage:''
      }
    }

    getCameraPermissions = async (id) =>{
      const {status} = await Permissions.askAsync(Permissions.CAMERA);
      
      this.setState({
        /*status === "granted" is true when user has granted permission
          status === "granted" is false when user has not granted the permission
        */
        hasCameraPermissions: status === "granted",
        buttonState: id,
        scanned: false
      });
    }

    handleBarCodeScanned = async({type, data})=>{
      const {buttonState} = this.state

      if(buttonState==="BookId"){
        this.setState({
          scanned: true,
          scannedBookId: data,
          buttonState: 'normal'
        });
      }
      else if(buttonState==="StudentId"){
        this.setState({
          scanned: true,
          scannedStudentId: data,
          buttonState: 'normal'
        });
      }
      
    }

    handleTransaction=async()=>{

      var transactionType = await this.checkBookEligibility()
      console.log("Transaction type", transactionType)
      if(!transactionType){
        alert("The book does not exist in the library database!")
        this.setState({
          scannedBookId:'',
          scannedStudentId:''
        })
      }

      else if(transactionType === "Issue"){
        var isStudentEligible = await this.checkStudentEligibilityForIssue()
        if(isStudentEligible){
          this.initiateBookIssue()
          alert("Book Issued to the student!")
        }
        
      }
      else{
        var isStudentEligible = await this.checkStudentEligibilityForReturn()
        console.log("Is Student eligible",isStudentEligible)
        if(isStudentEligible){
          this.initiateBookReturn()
          alert("Book Returned to the library")
        }
      }
/*
-------------------------------
EARLIER : We only checked book availability and immediately went for issue or return. 
  NOW:    We are making some functions to check the book data for existence of the book and then the availability. 
          Also we will check the student data.
-------------------------------
      var transactionMessage
      db.collection("books").doc(this.state.scannedBookId).get().then(
        (doc)=>{
          console.log(doc.data())
          var book = doc.data()

          if(book.bookAvailability){
            this.initiateBookIssue()
            transactionMessage="Book Issued"
            ToastAndroid.show(transactionMessage,ToastAndroid.SHORT)
          }
          else{
            this.initiateBookReturn()
            transactionMessage="Book Returned"
            ToastAndroid.show(transactionMessage,ToastAndroid.SHORT)
            //Alert.alert(transactionMessage)
          }

        }
      )
      this.setState({transactionMessage:transactionMessage})
      */
    }

    checkBookEligibility = async()=>{
      const BookRef = await db.collection("books").where("bookId","==",this.state.scannedBookId).get();
      var transactionType="";
      if(BookRef.docs.length === 0){
        transactionType = false
        console.log(BookRef.docs.length)
      }
      else{
        BookRef.docs.map((doc)=>{
          var book = doc.data()
          if(book.bookAvailability){
            transactionType = "Issue"
          }
          else{
            transactionType = "Return"
          }
        })
      }
      return transactionType
    }

    checkStudentEligibilityForIssue = async ()=>{
      const studentRef = await db.collection("students").where("studentId","==",this.state.scannedStudentId).get()
      var isStudentEligible="";
      if(studentRef.docs.length == 0){
        isStudentEligible=false
        alert("The student ID does not exist in the library database!")
        this.setState({
          scannedBookId:'',
          scannedStudentId:''
        })
      }
      else{
        studentRef.docs.map((doc)=>{
          var student = doc.data()
          if(student.noOfBooksIssued<2){
            isStudentEligible = true
          }
          else{
            isStudentEligible = false
            alert("The student has already issued two books!")
            this.setState({
              scannedBookId:'',
              scannedStudentId:''
            })
          }
        })
      }
      return isStudentEligible
    }

    checkStudentEligibilityForReturn = async ()=>{
      const transactionRef = await db.collection("transaction").where("bookId","==",this.state.scannedBookId).limit(1).get();
      var isStudentEligible =""
      transactionRef.docs.map((doc)=>{
        var lastBookTransaction = doc.data()
        if(lastBookTransaction.studentId === this.state.scannedStudentId){
          isStudentEligible = true
        }
        else{
          isStudentEligible = false
          alert("The book was not issued by this student!")
          this.setState({
            scannedBookId:'',
            scannedStudentId:''
          })
        }
      })
      return isStudentEligible
    }

    initiateBookIssue=async()=>{
      db.collection("books").doc(this.state.scannedBookId).update({
        "bookAvailability": false
      })
      db.collection("students").doc(this.state.scannedStudentId).update({
        "noOfBooksIssued": firebase.firestore.FieldValue.increment(1)
      })
      db.collection("transaction").add({
        'studentId': this.state.scannedStudentId,
        "bookId":this.state.scannedBookId,
        "date": firebase.firestore.Timestamp.now().toDate()
        ,'transactionType':"Issue"
      })

      //alert("Book Issued!")

    }

    initiateBookReturn=async()=>{
      db.collection("books").doc(this.state.scannedBookId).update({
        "bookAvailability": true
      })
      db.collection("students").doc(this.state.scannedStudentId).update({
        "noOfBooksIssued": firebase.firestore.FieldValue.increment(-1)
      })
      db.collection("transaction").add({
        'studentId': this.state.scannedStudentId,
        "bookId":this.state.scannedBookId,
        "date": firebase.firestore.Timestamp.now().toDate()
        ,'transactionType':"Return"
      })

     
      //alert("Book Returned!")
    }

    render() {
      const hasCameraPermissions = this.state.hasCameraPermissions;
      const scanned = this.state.scanned;
      const buttonState = this.state.buttonState;

      if (buttonState !== "normal" && hasCameraPermissions){
        return(
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
        );
      }

      else if (buttonState === "normal"){
        return(
          <KeyboardAvoidingView style={styles.container} behavior="height" enabled>
            <View>
            <Image
                source={require("../assets/booklogo.jpg")}
                style={{width:200, height: 200}}/>
              <Text style={{textAlign: 'center', fontSize: 30}}>Wily</Text>
            </View>
            <View style={styles.inputView}>
            <TextInput 
             onChangeText={text=>this.setState({scannedBookId:text})}
              style={styles.inputBox}
              placeholder="Book Id"
              value={this.state.scannedBookId}/>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={()=>{
                this.getCameraPermissions("BookId")
              }}>
              <Text style={styles.buttonText}>Scan</Text>
            </TouchableOpacity>
            </View>
            <View style={styles.inputView}>
            <TextInput 
              onChangeText={text=>this.setState({scannedStudentId:text})}
              style={styles.inputBox}
              placeholder="Student Id"
              value={this.state.scannedStudentId}/>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={()=>{
                this.getCameraPermissions("StudentId")
              }}>
              <Text style={styles.buttonText}>Scan</Text>
            </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{backgroundColor:"gold", width:100, height:50}}
              onPress={
                async()=>{
                  this.handleTransaction()
                  this.setState({scannedBookId:'',scannedStudentId:''})
                }
              }
            >
              <Text
              style={{padding:20, textAlign:'center'}}
              >SUBMIT</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        );
      }
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    displayText:{
      fontSize: 15,
      textDecorationLine: 'underline'
    },
    scanButton:{
      backgroundColor: '#2196F3',
      padding: 10,
      margin: 10
    },
    buttonText:{
      fontSize: 15,
      textAlign: 'center',
      marginTop: 10
    },
    inputView:{
      flexDirection: 'row',
      margin: 20
    },
    inputBox:{
      width: 200,
      height: 40,
      borderWidth: 1.5,
      borderRightWidth: 0,
      fontSize: 20
    },
    scanButton:{
      backgroundColor: '#66BB6A',
      width: 50,
      borderWidth: 1.5,
      borderLeftWidth: 0
    }
  });