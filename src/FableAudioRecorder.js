/* eslint-disable no-console */
import React, { Component } from 'react';
import {
	ScrollView,
	Text,
	TouchableOpacity,
	View,
	Platform,
} from 'react-native';
import { AudioRecorder, AudioUtils } from "react-native-audio";
import Icon from 'react-native-vector-icons/Ionicons';
import moment from 'moment';
import RNFetchBlob from 'react-native-fetch-blob';
import Sound from "react-native-sound";

import styles from './styles/FableAudioRecorder';

const fileExtension = 'aac';
const initialRecord = 'test.aac';
const DOCUMENT_DIR = `${AudioUtils.DocumentDirectoryPath}/innerview`;
const RNFS = RNFetchBlob.fs;

class FableAudioRecorder extends Component {
	constructor(props) {
		super(props);

		this.state = {
			audioPath: `${DOCUMENT_DIR}/${initialRecord}`,
			currentTime: 0.0,
			finished: false,
			recording: false,
			recordsList: [],
			stoppedRecording: false,
			data: null,
		};

		this._pause = this._pause.bind(this);
		this._record = this._record.bind(this);
		this._stop = this._stop.bind(this);
	}

	componentDidMount() {
		RNFS.isDir(DOCUMENT_DIR).then(isDir => {
			if (isDir) {
				this._prepareRecorder();
			} else {
				RNFetchBlob.fs.mkdir(DOCUMENT_DIR).then(res => {
					this._prepareRecorder();
				});
			}
		});
	}

	_prepareRecordingPath(audioPath) {
		AudioRecorder.prepareRecordingAtPath(audioPath, {
			SampleRate: 22050,
			Channels: 1,
			AudioQuality: "Low",
			AudioEncoding: fileExtension,
			AudioEncodingBitRate: 32000
		});
	}

	_prepareRecorder(audioPath) {
		this._getAllRecords();
		this._prepareRecordingPath(this.state.audioPath);

		AudioRecorder.onFinished = data => {
			if (Platform.OS === 'ios') {
				this._finishRecording(
					data.status === "OK",
					data.audioFileURL
				);
			}
		};

		AudioRecorder.onProgress = data => {
			this.setState({ currentTime: Math.floor(data.currentTime) });
		};
	}

	async _getAllRecords() {
		const files = [];
		// RNFetchBlob.fs.ls(DOCUMENT_DIR)
		const result = await RNFS.ls(DOCUMENT_DIR);
		result.filter(item => {
			if (item === '.DS_Store' || item === initialRecord) return false;
			files.push(item);

			return true;
		});

		this.setState({ recordsList: files });
	}

	async _record() {
		if (this.state.stoppedRecording) {
			this._prepareRecordingPath(this.state.audioPath);
		}

		this.setState({ recording: true });

		try {
			await AudioRecorder.startRecording();
		} catch (error) {
			console.error(error);
		}
	}

	async _pause() {
		this.setState({ stoppedRecording: false, recording: false });

		try {
			await AudioRecorder.pauseRecording();
		} catch (error) {
			console.error(error);
		}
	}

	async _stop() {
		this.setState({ stoppedRecording: true, recording: false });

		setTimeout(() => {
			const dateTime = moment().format('MM-DD-YYYY[T]hh:mm:ss');
			if (this.state.finished) {
				// RNFetchBlob.fs.cp
				console.log(`${DOCUMENT_DIR}/${initialRecord}`);
				RNFS.cp(
					`${DOCUMENT_DIR}/${initialRecord}`,
					`${DOCUMENT_DIR}/${dateTime}.${fileExtension}`
				);
				this.setState({ finished: false });
			}
			this._getAllRecords();
		}, 200);

		try {
			await AudioRecorder.stopRecording();
			if (Platform.OS === 'android') {
				this._finishRecording(true, this.state.audioPath);
			}
		} catch (error) {
			console.error(error);
		}
	}

	async _play(item) {
		console.log(item);
		if (this.state.recording) await this._stop();

		const sound = new Sound(`${DOCUMENT_DIR}/${item}`, '', error => {
			if (error) {
				console.log("Failed to load the sound", error);
			}
		});

		setTimeout(() => {
			sound.play(success => {
				if (success) {
					console.log("successfully finished playing");
				} else {
					console.log("playback failed due to audio decoding errors");
				}
			});
		}, 100);
	}

	async _delete(item) {
		// RNFetchBlob.fs(`${DOCUMENT_DIR}/${item}`)
		await RNFS.unlink(`${DOCUMENT_DIR}/${item}`);
		this._getAllRecords();
	}

	_finishRecording(didSucceed, filePath) {
		this.setState({ finished: didSucceed });
		console.log(`Finished recording of duration ${this.state.currentTime} seconds at path: ${filePath}`);
	}

	render() {
		return (
			<View style={styles.container}>
				<Text>{this.state.currentTime}</Text>
				<View style={styles.controls}>
					<TouchableOpacity onPress={this.state.recording ? this._pause : this._record}>
						<View>
							<Icon
								name={this.state.recording ? "ios-pause" : "ios-radio-button-on"}
								style={[styles.controlIcon, { color: this.state.recording ? 'black' : 'red' }]}
							/>
						</View>
					</TouchableOpacity>

					<TouchableOpacity onPress={this._stop}>
						<View>
							<Text style={styles.doneText}>Done</Text>
						</View>
					</TouchableOpacity>
				</View>

				<View style={styles.recordsList}>
					<ScrollView style={styles.scrollView}>
						{ this.state.recordsList.map((item, index) =>
							<View key={index} style={styles.scrollViewContent}>
								<TouchableOpacity onPress={this._play.bind(this, item)}>
									<Text style={styles.recordItem}>{item}</Text>
								</TouchableOpacity>

								<TouchableOpacity onPress={this._delete.bind(this, item)}>
									<Icon name="ios-trash-outline" style={styles.deleteIcon} />
								</TouchableOpacity>
							</View>
						)}

						{ !this.state.recordsList.length &&
							<View style={styles.noRecords}>
								<Text>No Audio Recorded</Text>
								<Icon name="ios-recording-outline" style={styles.noRecordsIcon} />
							</View>
						}
					</ScrollView>
				</View>
			</View>
		);
	}
}

export default FableAudioRecorder;
