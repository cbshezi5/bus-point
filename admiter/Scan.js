import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, LogBox,TouchableOpacity,BackHandler,Alert,Vibration } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useNavigation } from '@react-navigation/core';
import { useDispatch,useSelector } from 'react-redux';
import { setStNumber,setMusic,selectStNumber,selectMusic,selectOrigin } from '../slices/navSlice';
import Parse from "parse/react-native";
import { db } from '../firebase-config';
import {collection,query,getDocs } from "firebase/firestore"

async function getUserDet(setUserDetails,setUserMeta,setUsername) {
  await Parse.User.currentAsync()
  .then((loggedInUser)=>{
      setUserDetails(loggedInUser.get("firstName")+" "+loggedInUser.get("lastName"))
      setUserMeta(loggedInUser.getEmail())
      setUsername(loggedInUser.getUsername())
      
      
  })
  .catch((error)=>{
      console.log(error.message)
      ToastAndroid.show("Sorry we couldn't get your details",500)
  }) 
  
}


const doUserQuery = async function (studentNumber,dispatch,setStNumber,route,setO,setD,setT,setTColor,setAcces) {
  const parseQuery = new Parse.Query(Parse.User);
  let arrayVal;
  let curDate = new Date()
  let tripToken;
  curDate = curDate.getDate()+"-"+(curDate.getMonth()+1)+"-"+curDate.getFullYear()
  if (studentNumber !== '') {   
    parseQuery.matches('username', studentNumber, 'i');
  }
  
  // Only after calling "find" all query conditions will resolve
  return await parseQuery
    .find()
    .then(async (queriedUsers) => {
      arrayVal = queriedUsers
          .map(doc => ({
              firstName : doc.get("firstName"),
              lastName : doc.get("lastName"),
              email : doc.getEmail(),
              userName : doc.getUsername(),
          }))
          dispatch(setStNumber({"firstName":arrayVal[0]?.firstName,
                                "lastName":arrayVal[0]?.lastName,
                                "stNumber":arrayVal[0]?.userName,
                                "email":arrayVal[0]?.email}))
                                
         ////////////////////////////////Trip Detail retriving//////////////////////////////////////
         await getDocs(
          query(collection(db,"Trip")))
            .then((data)=>
            {tripToken = data.docs
            .filter((doc) => doc.get("Date") == curDate)
            .filter((doc) => doc.get("StudentNumber") == String(studentNumber))
            .filter((doc) => doc.get("Temporally") == false)
            .filter((doc) => doc.get("Status") == "Active")
            .map(doc=> ({
              id : doc.id,
              ...doc.data()
            }))
          })
       dispatch(setMusic({"Origin":tripToken[0]?.From,
                          "Destination":tripToken[0]?.To,
                          "Date":tripToken[0]?.Date,
                          "Time":tripToken[0]?.Time}))   
        
        if(tripToken.length < 1)
        {
          setTColor("No trip found for today")
          setAcces("red")
          return
        }
        if(route?.From != tripToken[0]?.From)
        {
          setO("red")
          setTColor("Deny")
          setAcces("red")
          return
        }

        if(route?.To != tripToken[0]?.To)
        {
          setD("red")
          setTColor("Deny")
          setAcces("red")
          return
        }

        timeCheckUp(tripToken,setT,setTColor,setAcces)

      return true;
    })
    .catch((error) => {
      console.log(error.message)
    })

    
}

function timeCheckUp(tripDetails,setColorErrT,setAccess,setColorSta)
  {
    
    let tripTimeHr 
      if(tripDetails[0]?.Time != null)
      {
        tripTimeHr = tripDetails[0]?.Time.substr(0,tripDetails[0]?.Time.indexOf(':'))
       
        if(tripTimeHr == (new Date().getHours() + 1))
        {
          setAccess("Accept")
          setColorSta("lightgreen")
          setColorErrT("white")
        }
        else
        {
          setAccess("Deny")
          setColorSta("red")
          setColorErrT("red")
        }
      }
  }

export default function Scan() {
  LogBox.ignoreLogs(['Setting a timer'])

  

  //Declaration
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [userMeta,setUserMeta] = useState();
  const [UserDetails, setUserDetails] = useState();
  const hr = (new Date().getHours() + 1);
  const navigation = useNavigation()
  const dispatch = useDispatch()
  const studentNumber = useSelector(selectStNumber);
  const tripDetails = useSelector(selectMusic)
  const route = useSelector(selectOrigin)
  const [username, setUsername] = useState("white");


  //False indication setter on visual
  const [colorErrO, setColorErrO] = useState("white");
 
  const [colorErrD, setColorErrD] = useState("white");
  
  const [colorErrT, setColorErrT] = useState("white");

  const [access, setAccess] = useState("");
  
  const [colorSta, setColorSta] = useState("white");
  


  getUserDet(setUserDetails,setUserMeta,setUsername)

  //Block Default back button
  React.useEffect(
    () => 
        navigation.addListener('beforeRemove', (e) => {
        const action = e.data.action;
      
       if(action?.type === "GO_BACK")
       {
        e.preventDefault();
        
        Alert.alert(
          'Cation',
          'Are you sure you would like to leave scan activity?',
          [
            { text: "Back", style: 'default', onPress: () => {navigation.navigate("Route",{username:username})} },
            { text: "Cancel", style: 'cancel', onPress: () => {} },
            { text: 'Exit',style: 'destructive',onPress: () => BackHandler.exitApp() },
          ]
        );
       }
       
      }),
    [navigation]
  );


  //Getting Permission of Camera
  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  //Handling the scanned QR code
  const handleBarCodeScanned = ({  data }) => {
    setColorErrO("white")
    setColorErrT("white")
    setColorErrD("white")
    setColorSta("lightgreen")
    setAccess("Accept")
    dispatch(setMusic({"Origin":"Loading...",
                          "Destination":"Loading...",
                          "Date":"Loading...",
                          "Time":"Loading..."})) 

    setScanned(true);
    doUserQuery(data,dispatch,setStNumber,route,setColorErrO,setColorErrD,setColorErrT,setAccess,setColorSta)
    
    Vibration.vibrate(40)
  };

  //Handle of camera permission miss state
      if (hasPermission === null) {
        return <Text>Requesting for camera permission</Text>;
      }
      if (hasPermission === false) {
        return <Text>No access to camera</Text>;
      }

  

    
    

  //Render output
  return (
   
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      /> 
      {
        scanned &&
            <View style={styles.cover}>
                  {/*                 Header                      */}
                    <View style={styles.admiter}>
                          <Text style={styles.adm}>Admiter : {UserDetails}</Text>
                          <Text style={[styles.adm,{fontSize:14,color:"grey"}]}>Email : {userMeta}</Text>
                  </View>
                  <View style={[styles.admiter,{marginTop:0,backgroundColor:"black",height:30}]}>
                          <Text style={[styles.adm,{color:"white",alignSelf:"center"}]}>Time : {hr}:00 • </Text>
                  </View>
                  {/*                 Student Details                      */}
                  <View style={styles.details}>
                        <Text style={[styles.text,{fontSize:26}]}>Student Number: {studentNumber?.stNumber}</Text>                
                        <Text style={[styles.text,{color:"black"}]}>Student First Name: {studentNumber?.firstName}</Text>
                        <Text style={[styles.text,{color:"black"}]}>Student Last Name: {studentNumber?.lastName}</Text>
                        {
                            studentNumber?.email != null ?
                            (
                              <Text style={styles.text}>Student Email: {studentNumber?.email}</Text>
                            )
                            :
                              null
                        }
                        
                  {/*                 Student Personals                        */}
  
                  {/*                 Student Details Trip                     */}
                  {/*                 StudentTrips                             */}
                 
                  <View style={styles.passcard}>
                        <Text style={[styles.text,{fontSize:20,color:"white"}]}>Depureture: {tripDetails?.Origin}<Text style={{color:colorErrO}}> •</Text></Text>
                        <Text style={[styles.text,{fontSize:20,color:"white"}]}>Destination: {tripDetails?.Destination}<Text style={{color:colorErrD}}> •</Text></Text>
                        <Text style={[styles.text,{fontSize:20,color:"white"}]}>Time : {tripDetails?.Time}<Text style={{color:colorErrT}}> •</Text></Text>
                        <Text style={[styles.text,{fontSize:20,color:"white"}]}>Admition : <Text style={{color:colorSta}}>{access}</Text></Text>
                        </View>

                  </View>
                  {/*                 Footer                      */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.scanBtn} onPress={()=>{setScanned(false)}}>
                        <Text style={styles.scanTxt}>Scan</Text>
                    </TouchableOpacity>
                </View>  
            </View>
      }
    </View>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    borderRadius:50
  },
  cover:{
    backgroundColor:"white",
  },
  admiter:{
    backgroundColor:"whitesmoke",
    width:380,
    height:70,
    marginTop:50,
    alignSelf:"center",
    justifyContent:"center"
  },
  adm:{
      marginLeft:23,
      fontSize:17,
  },
  scanBtn:{
    alignSelf:"center",
    width:200,
    height:13

  },
  footer:
    {
        marginTop:50,
        alignSelf:"center",
        
    },
  scanBtn:{
    backgroundColor:"black",
    width:200,
    height:70,  
    justifyContent:"center",
    marginBottom:50,
    },
    scanTxt:{
        color:"white",
        alignSelf:"center",
        fontSize:20,
        fontWeight:"700"
    },
    details:{
      marginTop:23,
      marginLeft:33
    },
    text:{
      fontSize:18,
      marginTop:13
    },
    passcard:{
      marginLeft:-23,
      backgroundColor:"black",
      alignSelf:"center",
      width:300,
      marginTop:53,
      paddingBottom:23,
      paddingRight:23,
      paddingLeft:23,
      paddingTop:23,
      borderRadius:34
    }
});

